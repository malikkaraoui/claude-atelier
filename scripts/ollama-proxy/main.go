// ollama-proxy — Anthropic /v1/messages → Ollama /api/chat
//
// Listens on localhost:4000 (configurable via PORT env).
// Translates Anthropic Messages API requests to Ollama chat format.
//
// Limitations (mode dégradé MVP) :
//   - tool_use / tool_result not supported — rejected with 501
//   - system prompt extracted from first "system" message if present
//   - streaming not supported — buffered response only
//
// Usage:
//
//	go run main.go
//	ANTHROPIC_BASE_URL=http://localhost:4000 claude
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// ── Config ────────────────────────────────────────────────────────────────────

type Config struct {
	OllamaURL string        `json:"ollama_url"`
	Port      string        `json:"port"`
	Presets   []ModelPreset `json:"presets"`
}

type ModelPreset struct {
	Name    string `json:"name"`
	Model   string `json:"model"`
	MaxRAM  int    `json:"max_ram_gb"` // 0 = unlimited (last preset)
}

func loadConfig() Config {
	cfg := Config{
		OllamaURL: "http://localhost:11434",
		Port:      "4000",
		Presets: []ModelPreset{
			{Name: "light", Model: "llama3.2:3b", MaxRAM: 8},
			{Name: "standard", Model: "mistral", MaxRAM: 16},
			{Name: "heavy", Model: "llama3.1:70b", MaxRAM: 0},
		},
	}

	data, err := os.ReadFile("config.json")
	if err != nil {
		return cfg // use defaults
	}
	if err := json.Unmarshal(data, &cfg); err != nil {
		log.Printf("[warn] config.json parse error: %v — using defaults", err)
	}
	return cfg
}

// ── Anthropic → Ollama translation ───────────────────────────────────────────

type AnthropicRequest struct {
	Model     string             `json:"model"`
	MaxTokens int                `json:"max_tokens"`
	System    string             `json:"system,omitempty"`
	Messages  []AnthropicMessage `json:"messages"`
	Tools     []interface{}      `json:"tools,omitempty"`
	Stream    bool               `json:"stream,omitempty"`
}

type AnthropicMessage struct {
	Role    string      `json:"role"`
	Content interface{} `json:"content"` // string or []ContentBlock
}

type ContentBlock struct {
	Type string `json:"type"`
	Text string `json:"text,omitempty"`
}

type OllamaRequest struct {
	Model    string          `json:"model"`
	Messages []OllamaMessage `json:"messages"`
	Stream   bool            `json:"stream"`
	Options  map[string]int  `json:"options,omitempty"`
}

type OllamaMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OllamaResponse struct {
	Model   string        `json:"model"`
	Message OllamaMessage `json:"message"`
	Done    bool          `json:"done"`
}

// AnthropicResponse mirrors the Messages API response shape.
type AnthropicResponse struct {
	ID           string            `json:"id"`
	Type         string            `json:"type"`
	Role         string            `json:"role"`
	Content      []ContentBlock    `json:"content"`
	Model        string            `json:"model"`
	StopReason   string            `json:"stop_reason"`
	StopSequence *string           `json:"stop_sequence"`
	Usage        AnthropicUsage    `json:"usage"`
}

type AnthropicUsage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

func extractText(content interface{}) string {
	switch v := content.(type) {
	case string:
		return v
	case []interface{}:
		var parts []string
		for _, block := range v {
			if m, ok := block.(map[string]interface{}); ok {
				if m["type"] == "text" {
					if t, ok := m["text"].(string); ok {
						parts = append(parts, t)
					}
				}
			}
		}
		return strings.Join(parts, "\n")
	}
	return ""
}

func translateMessages(req AnthropicRequest) (system string, messages []OllamaMessage) {
	system = req.System

	for _, m := range req.Messages {
		text := extractText(m.Content)
		role := m.Role
		if role == "assistant" {
			role = "assistant"
		}
		messages = append(messages, OllamaMessage{Role: role, Content: text})
	}
	return
}

// ── HTTP handler ──────────────────────────────────────────────────────────────

func makeHandler(cfg Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet && r.URL.Path == "/health" {
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprintf(w, `{"status":"ok","proxy":"ollama","version":"0.1.0"}`)
			return
		}

		if r.URL.Path != "/v1/messages" {
			http.Error(w, `{"type":"error","error":{"type":"not_found","message":"only /v1/messages is supported"}}`, http.StatusNotFound)
			return
		}
		if r.Method != http.MethodPost {
			http.Error(w, `{"type":"error","error":{"type":"method_not_allowed"}}`, http.StatusMethodNotAllowed)
			return
		}

		body, err := io.ReadAll(io.LimitReader(r.Body, 4<<20))
		if err != nil {
			http.Error(w, `{"type":"error","error":{"type":"api_error","message":"failed to read body"}}`, http.StatusInternalServerError)
			return
		}

		var anthropicReq AnthropicRequest
		if err := json.Unmarshal(body, &anthropicReq); err != nil {
			http.Error(w, `{"type":"error","error":{"type":"invalid_request_error","message":"invalid JSON"}}`, http.StatusBadRequest)
			return
		}

		// Mode dégradé — tools not supported
		if len(anthropicReq.Tools) > 0 {
			http.Error(w, `{"type":"error","error":{"type":"not_supported","message":"mode dégradé: tool_use/tool_result not supported by ollama-proxy MVP"}}`, http.StatusNotImplemented)
			return
		}

		// Resolve model: use first matching preset or fall back to last
		ollamaModel := cfg.Presets[len(cfg.Presets)-1].Model
		for _, p := range cfg.Presets {
			if strings.Contains(anthropicReq.Model, p.Name) || anthropicReq.Model == p.Model {
				ollamaModel = p.Model
				break
			}
		}

		system, messages := translateMessages(anthropicReq)

		// Prepend system as first message if present
		if system != "" {
			messages = append([]OllamaMessage{{Role: "system", Content: system}}, messages...)
		}

		ollamaReq := OllamaRequest{
			Model:    ollamaModel,
			Messages: messages,
			Stream:   false,
		}
		if anthropicReq.MaxTokens > 0 {
			ollamaReq.Options = map[string]int{"num_predict": anthropicReq.MaxTokens}
		}

		ollamaBody, _ := json.Marshal(ollamaReq)

		client := &http.Client{Timeout: 120 * time.Second}
		resp, err := client.Post(cfg.OllamaURL+"/api/chat", "application/json", strings.NewReader(string(ollamaBody)))
		if err != nil {
			msg := fmt.Sprintf(`{"type":"error","error":{"type":"api_error","message":"ollama unreachable: %s"}}`, err.Error())
			http.Error(w, msg, http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		respBody, _ := io.ReadAll(resp.Body)

		var ollamaResp OllamaResponse
		if err := json.Unmarshal(respBody, &ollamaResp); err != nil {
			msg := fmt.Sprintf(`{"type":"error","error":{"type":"api_error","message":"invalid ollama response: %s"}}`, string(respBody))
			http.Error(w, msg, http.StatusBadGateway)
			return
		}

		stopReason := "end_turn"
		anthropicResp := AnthropicResponse{
			ID:   fmt.Sprintf("msg_ollama_%d", time.Now().UnixNano()),
			Type: "message",
			Role: "assistant",
			Content: []ContentBlock{
				{Type: "text", Text: ollamaResp.Message.Content},
			},
			Model:      ollamaModel,
			StopReason: stopReason,
			Usage: AnthropicUsage{
				InputTokens:  0, // Ollama doesn't return token counts in all versions
				OutputTokens: 0,
			},
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(anthropicResp)

		log.Printf("[proxy] %s → %s (%d chars out)", anthropicReq.Model, ollamaModel, len(ollamaResp.Message.Content))
	}
}

// ── Main ──────────────────────────────────────────────────────────────────────

func main() {
	cfg := loadConfig()

	port := os.Getenv("PORT")
	if port != "" {
		cfg.Port = port
	}

	addr := "localhost:" + cfg.Port
	log.Printf("[ollama-proxy] listening on http://%s", addr)
	log.Printf("[ollama-proxy] ollama backend: %s", cfg.OllamaURL)
	log.Printf("[ollama-proxy] presets:")
	for _, p := range cfg.Presets {
		ram := fmt.Sprintf("≤%dGB", p.MaxRAM)
		if p.MaxRAM == 0 {
			ram = ">16GB"
		}
		log.Printf("  %-10s %s  (%s RAM)", p.Name, p.Model, ram)
	}
	log.Printf("[ollama-proxy] mode dégradé: tool_use/tool_result → 501 Not Implemented")

	mux := http.NewServeMux()
	mux.HandleFunc("/", makeHandler(cfg))

	srv := &http.Server{
		Addr:         addr,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 130 * time.Second,
	}

	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("[ollama-proxy] fatal: %v", err)
	}
}
