import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Send, MessageCircle } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const menuOptions = {
  sandwiches: [
    { name: "Classic Crispy", price: "$9.99" },
    { name: "Spicy Crispy", price: "$10.49" },
    { name: "Deluxe Stack", price: "$12.99" },
  ],
  chicken: [
    { name: "Tenders (4pc)", price: "$8.99" },
    { name: "Tenders (6pc)", price: "$11.99" },
    { name: "Wings (8pc)", price: "$10.99" },
  ],
  sides: [
    { name: "Waffle Fries", price: "$3.99" },
    { name: "Mac & Cheese", price: "$4.49" },
    { name: "Coleslaw", price: "$2.99" },
  ],
  drinks: [
    { name: "Fresh Lemonade", price: "$3.49" },
    { name: "Iced Tea", price: "$2.99" },
    { name: "Fountain Drink", price: "$2.49" },
  ],
};

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "Welcome to Featherweight Chicken. Ready to order?\n\nType a category to see options:\n• Sandwiches\n• Chicken\n• Sides\n• Drinks\n\nOr just tell me what you'd like.",
  },
];

const OrderChat = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input.toLowerCase();
    setInput("");

    // Simple response logic
    setTimeout(() => {
      let response = "";

      if (userInput.includes("sandwich")) {
        response = `**Sandwiches**\n\n${menuOptions.sandwiches
          .map((item) => `• ${item.name} — ${item.price}`)
          .join("\n")}\n\nWant to add one to your order?`;
      } else if (userInput.includes("chicken") || userInput.includes("tender") || userInput.includes("wing")) {
        response = `**Chicken**\n\n${menuOptions.chicken
          .map((item) => `• ${item.name} — ${item.price}`)
          .join("\n")}\n\nWant to add any to your order?`;
      } else if (userInput.includes("side") || userInput.includes("fries") || userInput.includes("mac")) {
        response = `**Sides**\n\n${menuOptions.sides
          .map((item) => `• ${item.name} — ${item.price}`)
          .join("\n")}\n\nPerfect with any meal.`;
      } else if (userInput.includes("drink") || userInput.includes("lemonade") || userInput.includes("tea")) {
        response = `**Drinks**\n\n${menuOptions.drinks
          .map((item) => `• ${item.name} — ${item.price}`)
          .join("\n")}\n\nAdd a drink?`;
      } else if (userInput.includes("menu") || userInput.includes("help") || userInput.includes("option")) {
        response =
          "Here's what we've got:\n\n• **Sandwiches** — Crispy chicken on brioche\n• **Chicken** — Tenders and wings\n• **Sides** — Fries, mac, slaw\n• **Drinks** — Fresh made daily\n\nJust say the word.";
      } else if (userInput.includes("classic") || userInput.includes("spicy") || userInput.includes("deluxe")) {
        response =
          "Good choice. Classic Crispy added to your order.\n\nAnything else? Sides? Drinks?";
      } else if (userInput.includes("order") || userInput.includes("checkout") || userInput.includes("pay")) {
        response =
          "Almost there.\n\nTo complete your order, please visit the counter or use our in-store kiosk.\n\nNo bad bites. ✓";
      } else {
        response =
          "Got it. What else can I help with?\n\nTry: sandwiches, chicken, sides, or drinks.";
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-primary/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Chat Panel */}
      <div className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-md animate-slide-in-right chat-panel flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-primary px-6 py-4">
          <div className="flex items-center gap-3">
            <MessageCircle size={20} className="text-accent" />
            <div>
              <h3 className="font-display text-lg font-bold text-primary-foreground">
                Order Now
              </h3>
              <p className="font-body text-xs text-primary-foreground/60">
                Featherweight Chicken
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-primary-foreground/70 transition-colors hover:text-primary-foreground"
            aria-label="Close chat"
          >
            <X size={24} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-card p-6">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-sm px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap font-body text-sm">
                    {message.content}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border bg-card p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your order..."
              className="flex-1 rounded-sm border border-border bg-background px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <Button type="submit" size="icon" variant="hero">
              <Send size={18} />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
};

export default OrderChat;
