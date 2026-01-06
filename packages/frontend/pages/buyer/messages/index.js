import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ArrowLeft } from 'lucide-react';
import Button from '../../../components/common/Button';
import BuyerConversationList from '../../../components/buyer/BuyerConversationList';
import BuyerChatWindow from '../../../components/buyer/BuyerChatWindow';
import apiService from '../../../lib/api';
import websocketService from '../../../lib/websocket';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export default function BuyerMessages() {
  const router = useRouter();
  const { conversation_id, company, order } = router.query;
  
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [currentChannel, setCurrentChannel] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchConversations();
    initializeWebSocket();
    handlePaymentCallback();
    
    return () => {
      websocketService.disconnect();
    };
  }, []);

  // Handle payment success/cancel callback
  const handlePaymentCallback = async () => {
    const { payment, payment_link_id } = router.query;
    
    if (payment === 'success' && payment_link_id) {
      try {
        await apiService.confirmPaymentSuccess(payment_link_id);
        toast.success('Payment successful! Thank you for your payment.');
        // Remove query params
        router.replace('/buyer/messages', undefined, { shallow: true });
      } catch (error) {
        console.error('Error confirming payment:', error);
      }
    } else if (payment === 'cancelled') {
      toast.error('Payment was cancelled');
      router.replace('/buyer/messages', undefined, { shallow: true });
    }
  };

  useEffect(() => {
    if (conversation_id && conversations.length > 0) {
      const conversation = conversations.find(c => c.id === parseInt(conversation_id));
      if (conversation) {
        setSelectedConversation(conversation);
        fetchMessages(conversation_id);
      }
    } else if (company && conversations.length > 0 && !conversation_id) {
      // Debug: Log all conversations to see structure
      console.log('🔍 Looking for company:', company);
      console.log('📋 Available conversations:', conversations);
      
      // Create or find conversation with this company
      createOrFindConversation(company);
    }
  }, [conversation_id, company, conversations, router]);

  // Subscribe to WebSocket when conversation is selected
  useEffect(() => {
    if (selectedConversation && user && wsConnected) {
      subscribeToConversation(selectedConversation.id);
    } else if (!selectedConversation || !selectedConversation.id) {
      // Unsubscribe from current channel if no conversation
      if (currentChannel) {
        websocketService.unsubscribeFromConversation(currentChannel);
        setCurrentChannel(null);
      }
    }
    
    return () => {
      if (currentChannel) {
        websocketService.unsubscribeFromConversation(currentChannel);
        setCurrentChannel(null);
      }
    };
  }, [selectedConversation, user, wsConnected]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await apiService.getBuyerConversations();
      setConversations(response.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      setMessagesLoading(true);
      const response = await apiService.getBuyerConversationMessages(conversationId);
      setMessages(response.messages || []);
      setSelectedConversation(response.conversation);
      
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const createOrFindConversation = async (companyId) => {
    try {
      // First, check if conversation already exists in our list
      const existingConversation = conversations.find(c => 
        c.seller?.company?.id === parseInt(companyId)
      );
      
      if (existingConversation) {
        console.log('📬 Found existing conversation:', existingConversation);
        setSelectedConversation(existingConversation);
        fetchMessages(existingConversation.id);
        router.replace(`/buyer/messages?conversation_id=${existingConversation.id}`, undefined, { shallow: true });
        return existingConversation;
      }
      
      // If no conversation exists, create a placeholder state to allow sending the first message
      // which will create the conversation
      console.log('📝 No existing conversation. User can send a message to start one.');
      const placeholderConversation = {
        id: null,
        new: true,
        seller: {
          company: {
            id: parseInt(companyId),
            name: 'Loading...'
          }
        }
      };
      setSelectedConversation(placeholderConversation);
      setMessages([]);
      return null;
    } catch (error) {
      console.error('Error creating/finding conversation:', error);
      return null;
    }
  };

  const initializeWebSocket = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('No auth token found, cannot initialize WebSocket');
        return;
      }

      console.log('🔌 Initializing WebSocket connection...');
      const pusherInstance = websocketService.connect(token);
      
      if (pusherInstance) {
        console.log('✅ WebSocket service connected successfully');
        setWsConnected(true);
        
        // Subscribe to user channel for notifications
        if (user?.id) {
          websocketService.subscribeToUserChannel(user.id, {
            onMessageNotification: handleNewMessageNotification
          });
        }
      } else {
        console.error('❌ Failed to initialize WebSocket service');
        setWsConnected(false);
      }
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      setWsConnected(false);
    }
  };

  const subscribeToConversation = (conversationId) => {
    if (!conversationId || currentChannel === conversationId) {
      return; // Already subscribed to this conversation
    }

    // Unsubscribe from previous conversation if any
    if (currentChannel) {
      websocketService.unsubscribeFromConversation(currentChannel);
    }

    console.log('📡 Subscribing to conversation:', conversationId);
    
    websocketService.subscribeToConversation(conversationId, {
      onMessageReceived: (data) => {
        console.log('🔔 Real-time message received:', data);
        handleRealTimeMessage(data);
      },
      onSubscribed: () => {
        console.log('✅ Successfully subscribed to conversation:', conversationId);
      },
      onError: (error) => {
        console.error('❌ Failed to subscribe to conversation:', error);
      }
    });

    setCurrentChannel(conversationId);
  };

  const handleRealTimeMessage = (data) => {
    console.log('📨 Processing real-time message:', data);
    
    // Handle different message structures from WebSocket
    let messageData = data.message || data; // Support both wrapped and direct message format
    
    console.log('📋 Message data:', messageData);
    console.log('📋 Message conversation_id:', messageData.conversation_id);
    console.log('📋 Current conversation id:', selectedConversation?.id);
    
    // Check if message is from current conversation
    if (messageData && selectedConversation && messageData.conversation_id === selectedConversation.id) {
      console.log('✅ Message matches current conversation, adding to messages');
      
      // Check if message already exists to prevent duplicates
      setMessages(prev => {
        const messageExists = prev.some(msg => msg.id === messageData.id);
        if (!messageExists) {
          console.log('✅ Adding new real-time message to conversation');
          return [...prev, messageData];
        } else {
          console.log('⚠️ Message already exists, skipping duplicate');
          return prev;
        }
      });
    }

    // Update conversations list
    if (messageData) {
      setConversations(prev => 
        prev.map(conv => {
          if (conv.id === messageData.conversation_id) {
            return {
              ...conv,
              latest_message: {
                message: messageData.message,
                sender_id: messageData.sender_id,
                created_at: messageData.created_at
              },
              last_message_at: messageData.created_at,
              unread_count: messageData.receiver_id === user?.id && 
                           (!selectedConversation || selectedConversation.id !== messageData.conversation_id)
                           ? conv.unread_count + 1 
                           : conv.unread_count
            };
          }
          return conv;
        })
      );
    }
  };

  const handleNewMessageNotification = useCallback((messageData) => {
    // Show browser notification for messages not in current conversation
    if (!selectedConversation || messageData.conversation_id !== selectedConversation.id) {
      if ('Notification' in window && Notification.permission === 'granted') {
        const senderName = messageData.sender?.name || messageData.message?.sender?.name || 'Someone';
        const messageText = messageData.message?.message || messageData.message || 'New message';
        
        new Notification(`New message from ${senderName}`, {
          body: messageText,
          icon: '/favicon.ico'
        });
      }
    }
  }, [selectedConversation]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleSendMessage = useCallback(async (message, attachment = null) => {
    if (!selectedConversation) return;

    try {
      // If this is a new conversation (no ID), send to recipient_id instead
      if (selectedConversation.new && selectedConversation.seller?.company?.id) {
        const response = await apiService.sendBuyerMessage({
          recipient_id: selectedConversation.seller.company.id,
          recipient_type: 'company',
          message: message,
          message_type: 'text'
        });
        
        if (response.success) {
          // Refresh conversations to get the newly created conversation
          await fetchConversations();
          
          // Find and select the new conversation
          const newConversation = conversations.find(c => 
            c.seller?.company?.id === selectedConversation.seller.company.id
          );
          
          if (newConversation) {
            setSelectedConversation(newConversation);
            fetchMessages(newConversation.id);
            router.replace(`/buyer/messages?conversation_id=${newConversation.id}`, undefined, { shallow: true });
          }
          
          return response;
        }
      } else {
        // Existing conversation - use normal flow
        const response = await apiService.sendBuyerMessageWithAttachment(
          selectedConversation.id,
          message,
          attachment
        );
        
        if (response.success) {
          // Immediately add the sent message to local state
          setMessages(prev => {
            const messageExists = prev.some(msg => msg.id === response.message.id);
            if (!messageExists) {
              console.log('✅ Adding sent message to local state');
              return [...prev, response.message];
            }
            return prev;
          });
          
          // Update the conversation's last message info without full reload
          setConversations(prev => 
            prev.map(conv => 
              conv.id === selectedConversation.id 
                ? {
                    ...conv,
                    latest_message: {
                      message: response.message.message,
                      sender_id: response.message.sender_id,
                      message_type: response.message.message_type,
                      created_at: response.message.created_at
                    },
                    last_message_at: response.message.created_at
                  }
                : conv
            )
          );
          
          return response;
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [selectedConversation, conversations, router]);

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
    router.push(`/buyer/messages?conversation_id=${conversation.id}`, undefined, { shallow: true });
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);


  return (
    <>
      <Head>
        <title>Messages - Pinoy Global Supply</title>
      </Head>

      <div className="h-[calc(100vh-4rem)] flex overflow-hidden">
        {/* Conversation List - Hidden on mobile when chat is selected */}
        <div className={`${
          selectedConversation ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 lg:w-96 flex-shrink-0`}>
          <BuyerConversationList
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            loading={loading}
          />
        </div>

        {/* Chat Window - Full width on mobile, flexible on desktop */}
        <div className={`${
          selectedConversation ? 'flex' : 'hidden md:flex'
        } flex-1 min-w-0`}>
          <BuyerChatWindow
            conversation={selectedConversation}
            messages={messages}
            onSendMessage={handleSendMessage}
            currentUser={user}
            loading={messagesLoading}
            onMessagesUpdate={setMessages}
            onBack={() => {
              setSelectedConversation(null);
              router.push('/buyer/messages', undefined, { shallow: true });
            }}
          />
        </div>
      </div>
    </>
  );
}
