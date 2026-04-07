import { useEffect, useRef, useState } from "react";
import "./chatbot.css";

const API_URL = "http://127.0.0.1:8000/chat";

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const readContext = () => {
    if (typeof window === "undefined") {
      return {
        risk_level: "unknown",
        weather: "unknown",
        speed: "unknown",
        road: "unknown",
      };
    }

    return {
      risk_level: localStorage.getItem("risk") || "unknown",
      weather: localStorage.getItem("weather") || "unknown",
      speed: localStorage.getItem("speed") || "unknown",
      road: localStorage.getItem("road") || "unknown",
    };
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const outgoingMessage = { sender: "user", text: trimmed };
    setMessages((prev) => [...prev, outgoingMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          ...readContext(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      const replyText = data?.reply || "I am sorry, I could not understand that.";

      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: replyText },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text:
            "I ran into an issue reaching the safety service. Please try again shortly.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chatbot-container">
      {isOpen && (
        <div
          id="chatbot-panel"
          className="chatbot-panel"
          role="dialog"
          aria-label="Safety AI chat window"
        >
          <div className="chatbot-header">
            <span>Safety AI Assistant</span>
            <button type="button" onClick={handleToggle} aria-label="Close chat" className="chatbot-close-button">
              ×
            </button>
          </div>
          <div className="chatbot-messages" aria-live="polite">
            {messages.length === 0 && !isLoading && (
              <div className="chatbot-empty">
                Ask me about current road risks, weather impacts, or safe driving tips.
              </div>
            )}
            {messages.map((message, index) => (
              <div key={`${message.sender}-${index}`} className={`chatbot-message ${message.sender === "user" ? "chatbot-message-user" : "chatbot-message-ai"}`}>
                {message.text}
              </div>
            ))}
            {isLoading && (
              <div className="chatbot-message chatbot-message-ai">AI typing...</div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="chatbot-input-row">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about road safety..."
              aria-label="Type your message"
            />
            <button type="button" onClick={handleSend} disabled={isLoading || !input.trim()} aria-label="Send message" className="chatbot-send">
              Send
            </button>
          </div>
        </div>
      )}
      <button type="button" className="chatbot-toggle" onClick={handleToggle} aria-expanded={isOpen} aria-controls="chatbot-panel">
        🚗 Safety AI
      </button>
    </div>
  );
};

export default Chatbot;
