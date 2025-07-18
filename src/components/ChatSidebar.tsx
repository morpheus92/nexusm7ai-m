import { useState, useEffect } from "react";
import { MessageSquare, Trash2, Plus, Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { AI_MODELS } from '@/lib/ai-models'; // Import AI_MODELS from shared file

interface ChatHistory {
  id: string;
  title: string;
  timestamp: string;
  preview: string;
  messages: any[]; // Use a more specific type if possible
}

interface ChatSidebarProps {
  onModelChange: (val: string) => void;
  selectedModel: string;
  onLoadHistory?: (historyId: string) => void;
  onNewChat?: () => void;
  aiModels: typeof AI_MODELS; // Use typeof AI_MODELS for type safety
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  onModelChange,
  selectedModel,
  onLoadHistory,
  onNewChat,
  aiModels,
}) => {
  const { user } = useAuth();
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);

  useEffect(() => {
    if (user?.id) {
      const savedHistory = localStorage.getItem(`chat_history_${user.id}`);
      if (savedHistory) {
        setChatHistory(JSON.parse(savedHistory));
      }
    }
  }, [user?.id]);

  const deleteHistory = (historyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHistory = chatHistory.filter(h => h.id !== historyId);
    setChatHistory(updatedHistory);
    if (user?.id) {
      localStorage.setItem(`chat_history_${user.id}`, JSON.stringify(updatedHistory));
    }
  };

  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat();
    }
  };

  // Map model IDs to icons for display
  const getModelIcon = (modelId: string) => {
    const model = aiModels.find(m => m.id === modelId);
    if (!model) return <MessageSquare className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />;

    switch (model.provider) {
      case 'pollinations':
        return <Bot className="w-4 h-4 text-cyan-400 mr-2 flex-shrink-0" />;
      case 'google':
        return <Sparkles className="w-4 h-4 text-blue-400 mr-2 flex-shrink-0" />;
      case 'groq':
        return <Sparkles className="w-4 h-4 text-orange-400 mr-2 flex-shrink-0" />;
      case 'openrouter':
        return <Sparkles className="w-4 h-4 text-purple-400 mr-2 flex-shrink-0" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />;
    }
  };

  // Get model name from ID
  const getModelName = (modelId: string) => {
    const model = aiModels.find(m => m.id === modelId);
    return model ? model.name : '未知模型';
  };

  return (
    <>
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #1a2436;
            border-radius: 2px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #2a3441;
            border-radius: 2px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #3a4451;
          }
          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `}
      </style>
      <aside className="w-full max-w-xs min-w-[280px] bg-gradient-to-b from-[#1b2234] to-[#131a26] border-r border-[#232b3a] px-6 py-7 flex flex-col gap-6 shadow-2xl relative z-20 max-h-[calc(100vh-80px)] overflow-hidden">
        {/* New Chat Button */}
        <Button
          onClick={handleNewChat}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg py-3 flex items-center justify-center gap-2 font-medium transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          新建对话
        </Button>

        {/* AI Model Selection */}
        <div>
          <div className="text-xs text-cyan-400 font-semibold mb-3 tracking-wide">
            AI助手模型
          </div>
          <select
            value={selectedModel}
            onChange={e => onModelChange(e.target.value)}
            className="w-full bg-[#151b2a] border border-[#23304d] text-gray-200 py-2.5 px-3 rounded-lg shadow mb-4 focus:outline-none focus:border-cyan-400 text-sm appearance-none relative"
          >
            {Object.entries(aiModels.reduce((groups: Record<string, any[]>, model) => {
              const groupName = model.group || "Other";
              if (!groups[groupName]) {
                groups[groupName] = [];
              }
              groups[groupName].push(model);
              return groups;
            }, {})).map(([group, models]: [string, any[]]) => (
              <optgroup key={group} label={group}>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4 4 4-4"></path>
            </svg>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-hidden">
          <div className="text-xs text-cyan-400 font-semibold mb-3 tracking-wide">
            聊天记录
          </div>
          <div className="flex flex-col gap-2 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar pr-2">
            {chatHistory.length > 0 ? (
              chatHistory.map((history) => (
                <div
                  key={history.id}
                  className="group bg-[#1a2436] hover:bg-[#243048] border border-[#2a3441] rounded-lg p-3 cursor-pointer transition-all duration-200 hover:border-cyan-400/50"
                  onClick={() => onLoadHistory && onLoadHistory(history.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-1">
                        {getModelIcon(history.messages?.[history.messages.length - 1]?.modelId || selectedModel)} {/* Use modelId from the last message or fallback */}
                        <h4 className="text-gray-200 text-sm font-medium truncate">
                          {history.title}
                        </h4>
                      </div>
                      <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">
                        {history.preview}
                      </p>
                      <div className="text-gray-500 text-xs mt-1">
                        {new Date(history.timestamp).toLocaleDateString()} • {getModelName(history.messages?.[history.messages.length - 1]?.modelId || selectedModel)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteHistory(history.id, e)}
                      className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-gray-400 hover:text-red-400 transition-all duration-200"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">暂无聊天记录</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default ChatSidebar;