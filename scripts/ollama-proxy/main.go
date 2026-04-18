// ollama-proxy — Anthropic /v1/messages → Ollama /api/chat
//
// Listens on localhost:4000 (configurable via PORT env).
// Translates Anthropic Messages API requests to Ollama chat format,
// including tool_use / tool_result bidirectional mapping.
//
// Limitations :
//   - streaming not supported — buffered response only
//   - system prompt extracted from "system" field (not system messages)
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
	Model     string        `json:"model"`
	Presets   []ModelPreset `json:"presets"`
}

type ModelPreset struct {
	Name   string `json:"name"`
	Model  string `json:"model"`
	MaxRAM int    `json:"max_ram_gb"`
}

func loadConfig() Config {
	cfg := Config{
		OllamaURL: "http://localhost:11434",
		Port:      "4000",
		Model:     "qwen3.5:4b",
		Presets: []ModelPreset{
			{Name: "light", Model: "qwen3.5:4b", MaxRAM: 8},
			{Name: "standard", Model: "qwen3.5:9b", MaxRAM: 16},
			{Name: "heavy", Model: "qwen3.5:35b", MaxRAM: 0},
		},
	}

	data, err := os.ReadFile("config.json")
	if err != nil {
		return cfg
	}
	if err := json.Unmarshal(data, &cfg); err != nil {
		log.Printf("[warn] config.json parse error: %v — using defaults", err)
	}
	return cfg
}

// ── Anthropic types ─────────────────────────────────────────────────────────

type AnthropicRequest struct {
	Model     string             `json:"model"`
	MaxTokens int                `json:"max_tokens"`
	System    interface{}        `json:"system,omitempty"` // string or []ContentBlock
	Messages  []AnthropicMessage `json:"messages"`
	Tools     []AnthropicTool    `json:"tools,omitempty"`
	Stream    bool               `json:"stream,omitempty"`
}

type AnthropicMessage struct {
	Role    string      `json:"role"`
	Content interface{} `json:"content"` // string or []ContentBlock
}

type AnthropicTool struct {
	Name        string      `json:"name"`
	Description string      `json:"description,omitempty"`
	InputSchema interface{} `json:"input_schema"` // JSON Schema object
}

type AnthropicResponse struct {
	ID           string         `json:"id"`
	Type         string         `json:"type"`
	Role         string         `json:"role"`
	Content      []ContentBlock `json:"content"`
	Model        string         `json:"model"`
	StopReason   string         `json:"stop_reason"`
	StopSequence *string        `json:"stop_sequence"`
	Usage        AnthropicUsage `json:"usage"`
}

type AnthropicUsage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

type ContentBlock struct {
	Type      string      `json:"type"`
	Text      string      `json:"text,omitempty"`
	ID        string      `json:"id,omitempty"`         // tool_use
	Name      string      `json:"name,omitempty"`       // tool_use
	Input     interface{} `json:"input,omitempty"`       // tool_use
	ToolUseID string      `json:"tool_use_id,omitempty"` // tool_result
	Content   interface{} `json:"content,omitempty"`     // tool_result (string or blocks)
	IsError   bool        `json:"is_error,omitempty"`    // tool_result
}

// ── Ollama types ────────────────────────────────────────────────────────────

type OllamaRequest struct {
	Model    string          `json:"model"`
	Messages []OllamaMessage `json:"messages"`
	Tools    []OllamaTool    `json:"tools,omitempty"`
	Stream   bool            `json:"stream"`
	Options  map[string]int  `json:"options,omitempty"`
}

type OllamaMessage struct {
	Role      string          `json:"role"`
	Content   string          `json:"content"`
	ToolCalls []OllamaToolCall `json:"tool_calls,omitempty"` // assistant → tool invocation
	ToolName  string          `json:"tool_name,omitempty"`   // role:"tool" → result
}

type OllamaToolCall struct {
	Type     string             `json:"type"` // "function"
	Function OllamaFunctionCall `json:"function"`
}

type OllamaFunctionCall struct {
	Index     int         `json:"index,omitempty"`
	Name      string      `json:"name"`
	Arguments interface{} `json:"arguments"` // object (not string)
}

type OllamaTool struct {
	Type     string         `json:"type"` // "function"
	Function OllamaFunction `json:"function"`
}

type OllamaFunction struct {
	Name        string      `json:"name"`
	Description string      `json:"description,omitempty"`
	Parameters  interface{} `json:"parameters"` // JSON Schema
}

type OllamaResponse struct {
	Model   string        `json:"model"`
	Message OllamaMessage `json:"message"`
	Done    bool          `json:"done"`
}

// ── Translation: Anthropic → Ollama ─────────────────────────────────────────

// translateTools converts Anthropic tool definitions to Ollama format.
func translateTools(tools []AnthropicTool) []OllamaTool {
	if len(tools) == 0 {
		return nil
	}
	out := make([]OllamaTool, len(tools))
	for i, t := range tools {
		out[i] = OllamaTool{
			Type: "function",
			Function: OllamaFunction{
				Name:        t.Name,
				Description: t.Description,
				Parameters:  t.InputSchema,
			},
		}
	}
	return out
}

// extractSystemPrompt handles both string and array system prompts.
func extractSystemPrompt(system interface{}) string {
	if system == nil {
		return ""
	}
	switch v := system.(type) {
	case string:
		return v
	case []interface{}:
		var parts []string
		for _, block := range v {
			if m, ok := block.(map[string]interface{}); ok {
				if t, ok := m["text"].(string); ok {
					parts = append(parts, t)
				}
			}
		}
		return strings.Join(parts, "\n")
	}
	return ""
}

// toolUseCounter generates unique tool_use IDs within a request.
var toolUseCounter int64

func genToolUseID() string {
	toolUseCounter++
	return fmt.Sprintf("toolu_proxy_%d_%d", time.Now().UnixNano(), toolUseCounter)
}

// translateMessages converts Anthropic messages to Ollama format.
// It handles text, tool_use, and tool_result content blocks.
func translateMessages(req AnthropicRequest) (system string, messages []OllamaMessage) {
	system = extractSystemPrompt(req.System)

	for _, m := range req.Messages {
		switch v := m.Content.(type) {
		case string:
			messages = append(messages, OllamaMessage{Role: m.Role, Content: v})

		case []interface{}:
			// Content is an array of blocks — may contain text, tool_use, tool_result
			var textParts []string
			var toolCalls []OllamaToolCall
			var toolResults []OllamaMessage

			for _, block := range v {
				bm, ok := block.(map[string]interface{})
				if !ok {
					continue
				}
				blockType, _ := bm["type"].(string)

				switch blockType {
				case "text":
					if t, ok := bm["text"].(string); ok {
						textParts = append(textParts, t)
					}

				case "tool_use":
					// Assistant message with tool invocation
					name, _ := bm["name"].(string)
					input := bm["input"]
					toolCalls = append(toolCalls, OllamaToolCall{
						Type: "function",
						Function: OllamaFunctionCall{
							Index: len(toolCalls),
							Name:  name,
							Arguments: input,
						},
					})

				case "tool_result":
					// User message with tool result → becomes role:"tool" message
					toolName := ""
					// Extract tool name from tool_use_id by looking up in previous messages
					// For now, we pass it as tool_name if available
					if tn, ok := bm["tool_name"].(string); ok {
						toolName = tn
					}
					content := extractToolResultContent(bm["content"])
					toolResults = append(toolResults, OllamaMessage{
						Role:     "tool",
						Content:  content,
						ToolName: toolName,
					})
				}
			}

			if m.Role == "assistant" {
				// Assistant message: may have text + tool_calls
				msg := OllamaMessage{
					Role:    "assistant",
					Content: strings.Join(textParts, "\n"),
				}
				if len(toolCalls) > 0 {
					msg.ToolCalls = toolCalls
				}
				messages = append(messages, msg)
			} else if m.Role == "user" {
				// User message: may have text blocks + tool_result blocks
				if len(textParts) > 0 {
					messages = append(messages, OllamaMessage{
						Role:    "user",
						Content: strings.Join(textParts, "\n"),
					})
				}
				// tool_result blocks become separate role:"tool" messages
				messages = append(messages, toolResults...)
			}
		}
	}
	return
}

// extractToolResultContent gets the text from a tool_result content field.
func extractToolResultContent(content interface{}) string {
	if content == nil {
		return ""
	}
	switch v := content.(type) {
	case string:
		return v
	case []interface{}:
		var parts []string
		for _, block := range v {
			if m, ok := block.(map[string]interface{}); ok {
				if t, ok := m["text"].(string); ok {
					parts = append(parts, t)
				}
			}
		}
		return strings.Join(parts, "\n")
	}
	return fmt.Sprintf("%v", content)
}

// ── Translation: Ollama → Anthropic (response) ─────────────────────────────

// translateResponse converts an Ollama response to Anthropic format.
func translateResponse(ollamaResp OllamaResponse, model string) AnthropicResponse {
	var contentBlocks []ContentBlock
	stopReason := "end_turn"

	// Add text content if present
	if ollamaResp.Message.Content != "" {
		contentBlocks = append(contentBlocks, ContentBlock{
			Type: "text",
			Text: ollamaResp.Message.Content,
		})
	}

	// Convert tool_calls to tool_use content blocks
	if len(ollamaResp.Message.ToolCalls) > 0 {
		stopReason = "tool_use"
		for _, tc := range ollamaResp.Message.ToolCalls {
			contentBlocks = append(contentBlocks, ContentBlock{
				Type:  "tool_use",
				ID:    genToolUseID(),
				Name:  tc.Function.Name,
				Input: tc.Function.Arguments,
			})
		}
	}

	// Ensure at least one content block
	if len(contentBlocks) == 0 {
		contentBlocks = append(contentBlocks, ContentBlock{
			Type: "text",
			Text: "",
		})
	}

	return AnthropicResponse{
		ID:         fmt.Sprintf("msg_ollama_%d", time.Now().UnixNano()),
		Type:       "message",
		Role:       "assistant",
		Content:    contentBlocks,
		Model:      model,
		StopReason: stopReason,
		Usage: AnthropicUsage{
			InputTokens:  0,
			OutputTokens: 0,
		},
	}
}

// ── HTTP handler ────────────────────────────────────────────────────────────

func makeHandler(cfg Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet && r.URL.Path == "/health" {
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprintf(w, `{"status":"ok","proxy":"ollama","version":"0.2.0"}`)
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

		// Resolve model: use config.json "model" field as default
		ollamaModel := cfg.Model
		if ollamaModel == "" && len(cfg.Presets) > 0 {
			ollamaModel = cfg.Presets[0].Model
		}

		system, messages := translateMessages(anthropicReq)

		// Prepend system as first message if present
		if system != "" {
			messages = append([]OllamaMessage{{Role: "system", Content: system}}, messages...)
		}

		// Translate tools
		ollamaTools := translateTools(anthropicReq.Tools)

		ollamaReq := OllamaRequest{
			Model:    ollamaModel,
			Messages: messages,
			Tools:    ollamaTools,
			Stream:   false,
		}
		if anthropicReq.MaxTokens > 0 {
			ollamaReq.Options = map[string]int{"num_predict": anthropicReq.MaxTokens}
		}

		ollamaBody, _ := json.Marshal(ollamaReq)

		if log.Default().Writer() != nil {
			log.Printf("[proxy] → ollama %s (%d tools, %d messages)", ollamaModel, len(ollamaTools), len(messages))
		}

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

		anthropicResp := translateResponse(ollamaResp, ollamaModel)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(anthropicResp)

		toolInfo := ""
		if len(ollamaResp.Message.ToolCalls) > 0 {
			toolInfo = fmt.Sprintf(" [%d tool_calls]", len(ollamaResp.Message.ToolCalls))
		}
		log.Printf("[proxy] %s → %s (%d chars out)%s", anthropicReq.Model, ollamaModel, len(ollamaResp.Message.Content), toolInfo)
	}
}

// ── Main ────────────────────────────────────────────────────────────────────

func main() {
	cfg := loadConfig()

	port := os.Getenv("PORT")
	if port != "" {
		cfg.Port = port
	}

	addr := "localhost:" + cfg.Port
	log.Printf("[ollama-proxy] v0.2.0 — tool_use enabled")
	log.Printf("[ollama-proxy] listening on http://%s", addr)
	log.Printf("[ollama-proxy] ollama backend: %s", cfg.OllamaURL)
	log.Printf("[ollama-proxy] default model: %s", cfg.Model)
	log.Printf("[ollama-proxy] presets:")
	for _, p := range cfg.Presets {
		ram := fmt.Sprintf("≤%dGB", p.MaxRAM)
		if p.MaxRAM == 0 {
			ram = ">16GB"
		}
		log.Printf("  %-10s %s  (%s RAM)", p.Name, p.Model, ram)
	}

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
