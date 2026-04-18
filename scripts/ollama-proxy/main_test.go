package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// ── translateResponse ─────────────────────────────────────────────────────

func TestTranslateResponseThinkingFallback(t *testing.T) {
	resp := OllamaResponse{
		Model: "test",
		Message: OllamaRespMsg{
			Role:     "assistant",
			Content:  "",
			Thinking: "je réfléchis",
		},
		Done: true,
	}
	result := translateResponse(resp, "test-model")
	if len(result.Content) == 0 {
		t.Fatal("expected at least one content block")
	}
	if !strings.HasPrefix(result.Content[0].Text, "[thinking fallback]") {
		t.Errorf("expected [thinking fallback] prefix, got: %q", result.Content[0].Text)
	}
}

func TestTranslateResponseToolUse(t *testing.T) {
	resp := OllamaResponse{
		Model: "test",
		Message: OllamaRespMsg{
			Role:    "assistant",
			Content: "",
			ToolCalls: []OllamaToolCall{
				{
					Type: "function",
					Function: OllamaFunctionCall{
						Name:      "bash",
						Arguments: map[string]interface{}{"command": "ls"},
					},
				},
			},
		},
		Done: true,
	}
	result := translateResponse(resp, "test-model")
	if result.StopReason != "tool_use" {
		t.Errorf("expected stop_reason tool_use, got %q", result.StopReason)
	}
	var toolBlock *ContentBlock
	for i := range result.Content {
		if result.Content[i].Type == "tool_use" {
			toolBlock = &result.Content[i]
			break
		}
	}
	if toolBlock == nil {
		t.Fatal("expected tool_use content block")
	}
	if toolBlock.Name != "bash" {
		t.Errorf("expected tool name bash, got %q", toolBlock.Name)
	}
}

// ── handleStreamingRequest ────────────────────────────────────────────────

func mockOllamaStream(chunks []string) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/x-ndjson")
		for _, c := range chunks {
			fmt.Fprintln(w, c)
			if f, ok := w.(http.Flusher); ok {
				f.Flush()
			}
		}
	}))
}

func TestHandleStreamingRequestBasicText(t *testing.T) {
	ollama := mockOllamaStream([]string{
		`{"model":"test","message":{"role":"assistant","content":"Bonjour"},"done":false}`,
		`{"model":"test","message":{"role":"assistant","content":" monde"},"done":false}`,
		`{"model":"test","message":{"role":"assistant","content":""},"done":true,"done_reason":"stop"}`,
	})
	defer ollama.Close()

	cfg := Config{OllamaURL: ollama.URL, Port: "0", Model: "test"}
	anthropicReq := AnthropicRequest{Model: "claude-sonnet", Stream: true}
	ollamaBody, _ := json.Marshal(OllamaRequest{Model: "test", Stream: true})

	rec := httptest.NewRecorder()
	handleStreamingRequest(rec, cfg, anthropicReq, ollamaBody, "test")
	body := rec.Body.String()

	for _, want := range []string{
		"event: message_start",
		"event: content_block_start",
		"event: content_block_delta",
		`"text_delta"`,
		"Bonjour",
		" monde",
		"event: content_block_stop",
		"event: message_delta",
		`"end_turn"`,
		"event: message_stop",
	} {
		if !strings.Contains(body, want) {
			t.Errorf("SSE body missing %q", want)
		}
	}
}

func TestHandleStreamingRequestThinkingFallback(t *testing.T) {
	// Simulate qwen3.5 putting response in thinking field when done
	ollama := mockOllamaStream([]string{
		`{"model":"test","message":{"role":"assistant","content":"","thinking":"réponse cachée"},"done":true,"done_reason":"stop"}`,
	})
	defer ollama.Close()

	cfg := Config{OllamaURL: ollama.URL, Port: "0", Model: "test"}
	anthropicReq := AnthropicRequest{Model: "claude-sonnet", Stream: true}
	ollamaBody, _ := json.Marshal(OllamaRequest{Model: "test", Stream: true})

	rec := httptest.NewRecorder()
	handleStreamingRequest(rec, cfg, anthropicReq, ollamaBody, "test")
	body := rec.Body.String()

	if !strings.Contains(body, "[thinking fallback]") {
		t.Error("expected [thinking fallback] prefix in SSE delta")
	}
	if !strings.Contains(body, "réponse cachée") {
		t.Error("expected thinking content in SSE delta")
	}
}

func TestHandleStreamingRequestWithToolUse(t *testing.T) {
	ollama := mockOllamaStream([]string{
		`{"model":"test","message":{"role":"assistant","content":"","tool_calls":[{"type":"function","function":{"name":"bash","arguments":{"command":"ls"}}}]},"done":true,"done_reason":"stop"}`,
	})
	defer ollama.Close()

	cfg := Config{OllamaURL: ollama.URL, Port: "0", Model: "test"}
	anthropicReq := AnthropicRequest{Model: "claude-sonnet", Stream: true}
	ollamaBody, _ := json.Marshal(OllamaRequest{Model: "test", Stream: true})

	rec := httptest.NewRecorder()
	handleStreamingRequest(rec, cfg, anthropicReq, ollamaBody, "test")
	body := rec.Body.String()

	for _, want := range []string{
		`"tool_use"`,
		`"input_json_delta"`,
		`"tool_use"`,
		`"bash"`,
	} {
		if !strings.Contains(body, want) {
			t.Errorf("SSE body missing %q", want)
		}
	}
	if !strings.Contains(body, `"tool_use"`) {
		t.Error("expected stop_reason tool_use in message_delta")
	}
}

func TestHandleStreamingRequestTruncated(t *testing.T) {
	// Simulate Ollama closing connection before done:true
	ollama := mockOllamaStream([]string{
		`{"model":"test","message":{"role":"assistant","content":"partial"},"done":false}`,
		// no done:true chunk — connection closes here
	})
	defer ollama.Close()

	cfg := Config{OllamaURL: ollama.URL, Port: "0", Model: "test"}
	anthropicReq := AnthropicRequest{Model: "claude-sonnet", Stream: true}
	ollamaBody, _ := json.Marshal(OllamaRequest{Model: "test", Stream: true})

	rec := httptest.NewRecorder()
	handleStreamingRequest(rec, cfg, anthropicReq, ollamaBody, "test")
	body := rec.Body.String()

	if !strings.Contains(body, `"error"`) {
		t.Error("expected SSE error event on truncated stream")
	}
	if strings.Contains(body, "message_stop") {
		t.Error("truncated stream should not emit message_stop")
	}
}
