import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  MoreVertical, 
  MessageSquare, 
  Clock, 
  Check, 
  AlertCircle, 
  X, 
  FileText, 
  Image, 
  Download,
  User,
  Building2
} from 'lucide-react';
import Button from '../common/Button';
import ProductMessageHeader from '../chat/ProductMessageHeader';
import PaymentLinkMessage from '../chat/PaymentLinkMessage';
import PaymentModal from '../chat/PaymentModal';
import { getImageUrl } from '../../lib/imageUtils';

// Helper function to get profile picture with fallback logic
const getProfilePicture = (conversation) => {
  // 1. Check if company owner has profile picture
  if (conversation?.seller?.profile_picture) {
    return getImageUrl(conversation.seller.profile_picture);
  }
  
  // 2. Check company agents for profile pictures
  if (conversation?.seller?.company?.agents && conversation.seller.company.agents.length > 0) {
    const agentWithPicture = conversation.seller.company.agents.find(agent => agent.profile_picture);
    if (agentWithPicture) {
      return getImageUrl(agentWithPicture.profile_picture);
    }
  }
  
  // 3. Random fallback image (female1-3 or male1-2)
  const randomImages = [
    '/female_1.png',
    '/female_2.png', 
    '/female_3.png',
    '/male_1.png',
    '/male_2.png'
  ];
  
  // Use conversation ID to consistently pick the same random image
  const index = conversation?.id ? conversation.id % randomImages.length : Math.floor(Math.random() * randomImages.length);
  return randomImages[index];
};

export default function BuyerChatWindow({ 
  conversation, 
  messages = [], 
  onSendMessage, 
  currentUser,
  loading = false,
  onMessagesUpdate,
  onBack // Add onBack prop for mobile navigation
}) {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentLink, setSelectedPaymentLink] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRetry = async (failedMessage) => {
    const updatedMessages = messages.map(msg => 
      msg.id === failedMessage.id ? { ...msg, status: 'sending' } : msg
    );
    onMessagesUpdate?.(updatedMessages);

    try {
      const response = await onSendMessage(failedMessage.message, failedMessage.attachment);
      
      if (response?.success) {
        const realMessage = { ...response.message, status: 'sent' };
        const finalMessages = messages.map(msg => 
          msg.id === failedMessage.id ? realMessage : msg
        );
        onMessagesUpdate?.(finalMessages);
      }
    } catch (error) {
      console.error('Failed to retry message:', error);
      
      const retryFailedMessages = messages.map(msg => 
        msg.id === failedMessage.id ? { ...msg, status: 'failed' } : msg
      );
      onMessagesUpdate?.(retryFailedMessages);
    }
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedFile) || sending) return;

    const messageText = newMessage.trim() || '';
    const tempId = `temp-${Date.now()}`;
    
    // Optimistic update - add message immediately
    const optimisticMessage = {
      id: tempId,
      conversation_id: conversation.id,
      sender_id: currentUser?.id,
      receiver_id: conversation.seller.id,
      message: messageText,
      attachment: selectedFile ? {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        uploading: true
      } : null,
      created_at: new Date().toISOString(),
      read: false,
      status: 'sending',
      sender: {
        id: currentUser?.id,
        name: currentUser?.name,
        email: currentUser?.email
      }
    };

    // Add to messages immediately
    const updatedMessages = [...messages, optimisticMessage];
    onMessagesUpdate?.(updatedMessages);

    setNewMessage('');
    const fileToSend = selectedFile;
    setSelectedFile(null);
    setSending(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      const response = await onSendMessage(messageText, fileToSend);
      
      // Replace optimistic message with real message
      if (response?.success) {
        const realMessage = { ...response.message, status: 'sent' };
        const finalMessages = updatedMessages.map(msg => 
          msg.id === tempId ? realMessage : msg
        );
        onMessagesUpdate?.(finalMessages);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Mark message as failed
      const failedMessages = updatedMessages.map(msg => 
        msg.id === tempId ? { ...msg, status: 'failed' } : msg
      );
      onMessagesUpdate?.(failedMessages);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e) => {
    setNewMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const shouldShowDateSeparator = (currentMessage, previousMessage) => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.created_at).toDateString();
    const previousDate = new Date(previousMessage.created_at).toDateString();
    
    return currentDate !== previousDate;
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 text-secondary-500">
        <div className="text-center p-8">
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-12 h-12 text-primary-600" />
          </div>
          <h3 className="text-xl font-semibold text-secondary-900 mb-2">Welcome to Messages</h3>
          <p className="text-secondary-600 max-w-md">Select a conversation from the sidebar to start chatting with suppliers</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-secondary-200 bg-white">
          <div className="animate-pulse flex items-center space-x-3">
            <div className="w-10 h-10 bg-secondary-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-secondary-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-secondary-200 rounded w-1/4"></div>
            </div>
          </div>
        </div>
        
        {/* Messages */}
        <div className="flex-1 p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`animate-pulse flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-xs p-3 rounded-lg ${i % 2 === 0 ? 'bg-secondary-200' : 'bg-primary-200'}`}>
                <div className="h-4 bg-secondary-300 rounded mb-2"></div>
                <div className="h-3 bg-secondary-300 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white w-full">
      {/* Header */}
      <div className="flex-shrink-0 p-3 sm:p-4 border-b border-secondary-200 bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            {/* Back button - only visible on mobile */}
            {onBack && (
              <button
                onClick={onBack}
                className="md:hidden p-2 -ml-2 hover:bg-secondary-100 rounded-lg transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 overflow-hidden bg-gray-200">
              <img 
                src={getProfilePicture(conversation)} 
                alt={conversation.seller.company?.name || conversation.seller.name || 'Supplier'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/female_1.png';
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-semibold text-secondary-900 truncate">
                {conversation.seller.company?.name || conversation.seller.name}
              </h2>
              {conversation.seller.company && (
                <p className="text-xs sm:text-sm text-secondary-600 truncate">
                  {conversation.seller.company.location}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-secondary-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full px-4">
            <div className="text-center max-w-sm">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-gray-200 mx-auto mb-3 sm:mb-4">
                <img 
                  src={getProfilePicture(conversation)} 
                  alt={conversation.seller.company?.name || conversation.seller.name || 'Supplier'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/female_1.png';
                  }}
                />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-secondary-900 mb-2">
                Start a conversation with {conversation.seller.company?.name || conversation.seller.name}
              </h3>
              <p className="text-secondary-600 text-xs sm:text-sm">
                Send a message to begin your conversation
              </p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const isCurrentUser = message.sender_id === currentUser?.id;
            const previousMessage = index > 0 ? messages[index - 1] : null;
            const showDateSeparator = shouldShowDateSeparator(message, previousMessage);

            // Debug log to check message structure
            if (message.product_context) {
              console.log('Message with product_context:', message);
            }

            return (
              <div key={message.id}>
                {showDateSeparator && (
                  <div className="flex items-center justify-center my-4">
                    <div className="bg-secondary-200 text-secondary-600 text-xs px-3 py-1 rounded-full">
                      {formatDate(message.created_at)}
                    </div>
                  </div>
                )}
                
                {/* Product Message Header */}
                {message.product_context && (
                  <ProductMessageHeader 
                    productContext={message.product_context}
                    messageType={message.message_type || 'message'}
                  />
                )}
                
                {/* Payment Link Message */}
                {message.message_type === 'payment_link' ? (
                  <PaymentLinkMessage
                    message={message}
                    isReceiver={message.receiver_id === currentUser?.id}
                    onPayClick={(msg) => {
                      setSelectedPaymentLink(msg);
                      setShowPaymentModal(true);
                    }}
                  />
                ) : (
                  <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      isCurrentUser 
                        ? message.status === 'failed' 
                          ? 'bg-red-100 text-red-900 border border-red-200' 
                          : message.status === 'sending'
                          ? 'bg-primary-300 text-white opacity-70'
                          : 'bg-primary-600 text-white'
                        : 'bg-white text-secondary-900 border border-secondary-200'
                    }`}>
                      {message.message && (
                        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                      )}
                    
                    {/* Attachment Display */}
                    {(message.attachment || message.attachments) && (
                      <div className="mt-2">
                        {(() => {
                          const attachment = message.attachment || message.attachments?.[0];
                          const isImage = attachment?.type?.startsWith('image/') || attachment?.mime_type?.startsWith('image/');
                          
                          if (isImage && attachment?.url) {
                            return (
                              <div className="max-w-xs">
                                <img 
                                  src={attachment.url?.startsWith('http') ? attachment.url : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000'}${attachment.url}`} 
                                  alt={attachment.name || attachment.original_name}
                                  className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(attachment.url?.startsWith('http') ? attachment.url : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000'}${attachment.url}`, '_blank')}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                  }}
                                />
                                <div className="hidden p-2 bg-secondary-50 rounded border">
                                  <div className="flex items-center space-x-2">
                                    <Image className="w-4 h-4 text-secondary-600" />
                                    <span className="text-sm font-medium text-secondary-900">
                                      {attachment.name || attachment.original_name}
                                    </span>
                                    <a 
                                      href={attachment.url?.startsWith('http') ? attachment.url : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000'}${attachment.url}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:text-blue-800"
                                    >
                                      <Download className="w-3 h-3" />
                                    </a>
                                  </div>
                                </div>
                                <div className="text-xs text-secondary-500 mt-1">
                                  {attachment.name || attachment.original_name} • {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : ''}
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="p-2 bg-secondary-50 rounded border">
                                <div className="flex items-center space-x-2">
                                  <FileText className="w-4 h-4 text-secondary-600" />
                                  <span className="text-sm font-medium text-secondary-900">
                                    {attachment?.name || attachment?.original_name}
                                  </span>
                                  {attachment?.uploading ? (
                                    <div className="text-xs text-secondary-500">Uploading...</div>
                                  ) : attachment?.url ? (
                                    <a 
                                      href={attachment.url?.startsWith('http') ? attachment.url : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000'}${attachment.url}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:text-blue-800"
                                    >
                                      <Download className="w-3 h-3" />
                                    </a>
                                  ) : null}
                                </div>
                                {attachment?.size && (
                                  <div className="text-xs text-secondary-500 mt-1">
                                    {(attachment.size / 1024).toFixed(1)} KB
                                  </div>
                                )}
                              </div>
                            );
                          }
                        })()}
                      </div>
                    )}
                    
                    <div className={`flex items-center justify-end mt-1 space-x-1 ${
                      isCurrentUser 
                        ? message.status === 'failed' 
                          ? 'text-red-600' 
                          : message.status === 'sending'
                          ? 'text-primary-100'
                          : 'text-primary-200'
                        : 'text-secondary-500'
                    }`}>
                      <span className="text-xs">{formatTime(message.created_at)}</span>
                      {isCurrentUser && (
                        <>
                          {message.status === 'sending' && (
                            <Clock className="w-3 h-3 animate-spin" />
                          )}
                          {message.status === 'sent' && message.read && (
                            <div className="w-3 h-3 rounded-full bg-green-400"></div>
                          )}
                          {message.status === 'sent' && !message.read && (
                            <Check className="w-3 h-3" />
                          )}
                          {message.status === 'failed' && (
                            <div className="flex items-center space-x-1">
                              <AlertCircle className="w-3 h-3" />
                              <button 
                                onClick={() => handleRetry(message)}
                                className="text-xs underline hover:no-underline"
                              >
                                Retry
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0 p-4 bg-white border-t border-secondary-200">
        {/* File Preview */}
        {selectedFile && (
          <div className="mb-3 p-3 bg-secondary-50 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {selectedFile.type.startsWith('image/') ? (
                  <Image className="w-5 h-5 text-secondary-600" />
                ) : (
                  <FileText className="w-5 h-5 text-secondary-600" />
                )}
                <div>
                  <p className="text-sm font-medium text-secondary-900">{selectedFile.name}</p>
                  <p className="text-xs text-secondary-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={handleRemoveFile}
                className="text-secondary-400 hover:text-secondary-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-end space-x-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-2"
            onClick={handleAttachmentClick}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
          />
          
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleTextareaChange}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows="1"
              style={{ minHeight: '40px', maxHeight: '120px' }}
              disabled={sending}
            />
          </div>
          
          <Button 
            onClick={handleSend} 
            disabled={(!newMessage.trim() && !selectedFile) || sending}
            className="mb-2"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Payment Modal (for buyers) */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedPaymentLink(null);
        }}
        paymentLink={selectedPaymentLink}
      />
    </div>
  );
}
