import { useState } from 'react';
import { 
  MessageSquare, 
  Search, 
  User, 
  Building2, 
  Shield, 
  Package 
} from 'lucide-react';
import Skeleton from '../common/Skeleton';
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

export default function BuyerConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
  searchTerm,
  onSearchChange,
  loading = false
}) {
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const filteredConversations = conversations.filter(conversation =>
    conversation.seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (conversation.seller.company?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="w-full border-r border-secondary-200 p-4">
        <Skeleton className="h-10 w-full mb-4" />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="mb-4">
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full md:border-r border-secondary-200 flex flex-col bg-white">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-secondary-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-semibold text-secondary-900">Conversations</h2>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-secondary-500">
            <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 text-secondary-300" />
            <p className="text-sm sm:text-base">No conversations yet</p>
            <p className="text-xs sm:text-sm">Start messaging suppliers from product pages</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onSelectConversation(conversation)}
              className={`p-3 sm:p-4 border-b border-secondary-100 cursor-pointer hover:bg-secondary-50 transition-colors ${
                selectedConversation?.id === conversation.id ? 'bg-primary-50 border-primary-200' : ''
              }`}
            >
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 overflow-hidden bg-gray-200">
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
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <h3 className="text-sm sm:text-base font-medium text-secondary-900 truncate">
                        {conversation.seller.company?.name || conversation.seller.name}
                      </h3>
                      {conversation.seller.company?.verified && (
                        <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-secondary-500 flex-shrink-0">
                      {formatTime(conversation.last_message_at)}
                    </span>
                  </div>
                  
                  {conversation.seller.company && (
                    <p className="text-sm text-secondary-600 mb-1">
                      {conversation.seller.company.location}
                    </p>
                  )}
                  
                  {conversation.latest_message && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-secondary-600 truncate">
                        {conversation.latest_message.message_type === 'product_inquiry' && (
                          <Package className="w-3 h-3 inline mr-1" />
                        )}
                        {conversation.latest_message.message}
                      </p>
                      {conversation.unread_count > 0 && (
                        <span className="bg-primary-600 text-white text-xs rounded-full px-2 py-1 ml-2">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
