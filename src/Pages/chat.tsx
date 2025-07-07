import React, { useState, useEffect, useRef } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  Bot,
  Send,
  User,
  Users,
  Truck,
  Package,
  Warehouse,
  TrendingUp,
  DollarSign,
  Factory,
  Shield,
  BarChart3,
  Square,
  Loader2,
  AlertCircle,
  CreditCard,
  Map,
  Target,
  Activity,
  Filter,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  isStreaming?: boolean;
}

interface StreamChunk {
  session_id: string;
  content: string;
  is_complete: boolean;
  message_id: string;
  chunk_index: number;
}

// Context button configurations matching backend ContextType enum
const contextButtons = [
  { id: 'CashFlowAnalysis', name: 'Cash Flow', icon: 'CreditCard' as const, color: 'bg-blue-500' },
  { id: 'RegionalSalesPerformance', name: 'Regional Sales', icon: 'Map' as const, color: 'bg-green-500' },
  { id: 'ProfitabilityAnalysis', name: 'Profitability', icon: 'TrendingUp' as const, color: 'bg-emerald-500' },
  { id: 'TopCustomersByRevenue', name: 'Top Customers', icon: 'Users' as const, color: 'bg-purple-500' },
  { id: 'VendorPerformanceMetrics', name: 'Vendor Performance', icon: 'Truck' as const, color: 'bg-orange-500' },
  { id: 'CriticalStockLevels', name: 'Critical Stock', icon: 'AlertCircle' as const, color: 'bg-red-500' },
  { id: 'ProductDemandTrends', name: 'Product Demand', icon: 'Package' as const, color: 'bg-indigo-500' },
  { id: 'SupplierRegionAnalysis', name: 'Supplier Regions', icon: 'Map' as const, color: 'bg-cyan-500' },
  { id: 'CreditRiskAssessment', name: 'Credit Risk', icon: 'Shield' as const, color: 'bg-yellow-500' },
  { id: 'ProductionEfficiencyAnalysis', name: 'Production', icon: 'Factory' as const, color: 'bg-pink-500' }
];

// Icon component mapper
const iconMap = {
  Users, Truck, Package, Warehouse, TrendingUp, DollarSign, Factory, Shield, 
  BarChart3, AlertCircle, CreditCard, Map, Target, Activity, Filter, X
} as const;

interface IconComponentProps {
  iconName: keyof typeof iconMap;
  size?: number;
  className?: string;
}

const IconComponent: React.FC<IconComponentProps> = ({ iconName, size = 12, className = "" }) => {
  const Icon = iconMap[iconName] || Package;
  return <Icon size={size} className={className} />;
};

const Chat: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionIdRef = useRef(`session-${Date.now()}`);
  const currentStreamingMessageIdRef = useRef<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hello! I'm your AI business assistant. Select context buttons below to analyze your business data, then ask your questions!",
      timestamp: new Date(),
      isLoading: false,
      isStreaming: false
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Context state
  const [activeContexts, setActiveContexts] = useState<Set<string>>(new Set());
  const [contextLoading, setContextLoading] = useState<Set<string>>(new Set());
  const [showContexts, setShowContexts] = useState(false);

  // Initialize AI service
  useEffect(() => {
    const initializeAI = async () => {
      try {
        await invoke('initialize_ai_chat');
      } catch (error) {
        console.error('Failed to initialize AI service:', error);
      }
    };
    initializeAI();
  }, []);

  // Set up streaming event listener - Fixed to avoid dependency issues
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupStreamListener = async () => {
      try {
        unlisten = await listen('ai-stream-chunk', (event) => {
          const chunk = event.payload as StreamChunk;

          if (chunk.session_id !== sessionIdRef.current) return;

          setMessages(prev => {
            return prev.map(msg => {
              if (msg.id === currentStreamingMessageIdRef.current && msg.isStreaming) {
                return {
                  ...msg,
                  content: msg.content + chunk.content,
                  isStreaming: !chunk.is_complete,
                  isLoading: false
                };
              }
              return msg;
            });
          });

          // Reset states when streaming is complete
          if (chunk.is_complete) {
            currentStreamingMessageIdRef.current = null;
            setIsLoading(false);
          }
        });
      } catch (error) {
        console.error('Failed to set up stream listener:', error);
      }
    };

    setupStreamListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []); // Removed currentStreamingMessageId dependency

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle input resize
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  // Toggle context button - Fixed to work with backend
  const toggleContext = async (contextId: string) => {
    console.log('Toggling context:', contextId);

    const newActiveContexts = new Set(activeContexts);

    if (newActiveContexts.has(contextId)) {
      console.log('Removing context:', contextId);
      newActiveContexts.delete(contextId);
      setActiveContexts(newActiveContexts);
      return;
    }

    console.log('Adding context to loading state:', contextId);
    setContextLoading(prev => new Set(prev).add(contextId));

    try {
      console.log('Calling get_context_data with:', [contextId]);
      const startTime = Date.now();

      // Call backend with array of context types
      const result = await invoke('get_context_data', {
        contextTypes: [contextId] // Send as array matching backend expectation
      });

      const endTime = Date.now();
      console.log('get_context_data completed in', endTime - startTime, 'ms');
      console.log('Result:', result);

      // Only activate if data loading was successful
      newActiveContexts.add(contextId);
      setActiveContexts(newActiveContexts);
      console.log('Context activated successfully:', contextId);

    } catch (error) {
      console.error('Failed to load context data for', contextId, ':', error);
      // Show user-friendly error message
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant' as const,
        content: `⚠️ Failed to load ${contextId} data: ${error}`,
        timestamp: new Date()
      }]);
    } finally {
      console.log('Removing from loading state:', contextId);
      setContextLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(contextId);
        return newSet;
      });
    }
  };

  // Cancel generation
  const cancelGeneration = async () => {
    if (currentStreamingMessageIdRef.current) {
      try {
        await invoke('cancel_ai_generation', {
          messageId: currentStreamingMessageIdRef.current
        });

        setIsLoading(false);
        const messageId = currentStreamingMessageIdRef.current;
        currentStreamingMessageIdRef.current = null;

        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId
              ? {
                ...msg,
                content: msg.content + "\n\n*Generation cancelled*",
                isLoading: false,
                isStreaming: false
              }
              : msg
          )
        );
      } catch (error) {
        console.error('Failed to cancel generation:', error);
        setIsLoading(false);
        currentStreamingMessageIdRef.current = null;
      }
    }
  };

  // Send message with context
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    const streamingMessageId = (Date.now() + 1).toString();
    const streamingMessage: Message = {
      id: streamingMessageId,
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
      isStreaming: true
    };

    setMessages(prev => [...prev, userMessage, streamingMessage]);
    setInputMessage('');
    setIsLoading(true);
    currentStreamingMessageIdRef.current = streamingMessageId;

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      // Convert active contexts to array for backend
      const activeContextTypes = Array.from(activeContexts);

      await invoke('send_ai_message_with_context', {
        message: userMessage.content,
        sessionId: sessionIdRef.current,
        activeContexts: activeContextTypes // Send as array matching backend expectation
      });

    } catch (error) {
      console.error('Send message error:', error);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === streamingMessageId
            ? {
              ...msg,
              content: `❌ Error: ${error}`,
              isLoading: false,
              isStreaming: false
            }
            : msg
        )
      );
      setIsLoading(false);
      currentStreamingMessageIdRef.current = null;
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Bot className="text-white" size={16} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Laboratory AI</h1>
            <p className="text-slate-400 text-xs">Business Intelligence Assistant</p>
          </div>
        </div>
        
        {activeContexts.size > 0 && (
          <div className="flex items-center gap-2 px-2 py-1 bg-slate-800 rounded-lg text-slate-300 text-xs">
            <BarChart3 size={12} />
            <span>{activeContexts.size} active</span>
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${message.type === 'user'
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                    : 'bg-gradient-to-br from-blue-500 to-purple-600'
                  }`}>
                  {message.type === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>

                {/* Message Content */}
                <div className={`px-4 py-3 rounded-2xl ${message.type === 'user'
                    ? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-100 border border-slate-700'
                  }`}>
                  {message.isLoading && !message.content ? (
                    <div className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-sm text-slate-400">Thinking...</span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                      {message.isStreaming && (
                        <motion.span
                          className="inline-block w-2 h-4 bg-blue-400 ml-1 rounded-sm"
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Context Buttons - Compact design above input */}
      <div className="px-4 py-3 border-t border-slate-800">
        {/* Context Toggle Button */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400">Data Context:</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowContexts(!showContexts)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                showContexts 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300 border border-slate-700'
              }`}
            >
              {showContexts ? (
                <>
                  <X size={12} />
                  <span>Hide</span>
                </>
              ) : (
                <>
                  <Filter size={12} />
                  <span>Select ({activeContexts.size})</span>
                </>
              )}
            </motion.button>
          </div>
          
          {/* Context Buttons - Horizontally Sliding */}
          <motion.div
            initial={false}
            animate={{ 
              height: showContexts ? 'auto' : 0,
              opacity: showContexts ? 1 : 0
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <motion.div
              initial={false}
              animate={{ 
                x: showContexts ? 0 : -20,
                opacity: showContexts ? 1 : 0
              }}
              transition={{ duration: 0.3, ease: "easeInOut", delay: showContexts ? 0.1 : 0 }}
              className="flex gap-1 overflow-x-auto scrollbar-hide pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {contextButtons.map((button) => (
                <motion.button
                  key={button.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleContext(button.id)}
                  disabled={contextLoading.has(button.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                    activeContexts.has(button.id)
                      ? `${button.color} text-white shadow-sm`
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300 border border-slate-700'
                  }`}
                >
                  {contextLoading.has(button.id) ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <IconComponent iconName={button.icon} size={10} />
                  )}
                  <span className="text-xs">{button.name}</span>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Input Container */}
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              disabled={isLoading}
              placeholder="Ask about your business data..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none disabled:opacity-50"
              rows={1}
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={isLoading ? cancelGeneration : sendMessage}
            disabled={!isLoading && !inputMessage.trim()}
            className={`p-3 rounded-xl transition-all flex items-center justify-center ${
              isLoading
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : inputMessage.trim()
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <Square size={18} />
            ) : (
              <Send size={18} />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Chat;