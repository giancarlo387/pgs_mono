import { Edit, Trash2, Eye, Package } from 'lucide-react';
import Link from 'next/link';
import Button from '../common/Button';
import Badge from '../common/Badge';
import ImageSwiper from '../common/ImageSwiper';

export default function ProductCard({ product, onEdit, onDelete, onView }) {
  const handleCardClick = (e) => {
    // Don't trigger if clicking on action buttons
    if (e.target.closest('button') || e.target.closest('a')) {
      return;
    }
    if (onView) {
      onView(product.id);
    }
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-secondary-200 overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="aspect-w-16 aspect-h-9 bg-secondary-100">
        {product.images && product.images.length > 0 ? (
          <ImageSwiper 
            images={product.images} 
            alt={product.name}
            className="w-full h-48"
          />
        ) : product.image ? (
          <img
            src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000'}/storage/${product.image}`}
            alt={product.name}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 flex items-center justify-center">
            <Package className="w-12 h-12 text-secondary-400" />
          </div>
        )}
      </div>
      
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-base sm:text-lg font-medium text-secondary-900 truncate pr-2">
            {product.name}
          </h3>
          <Badge variant="success" size="xs" className="flex-shrink-0">Active</Badge>
        </div>
        
        <p className="text-xs sm:text-sm text-secondary-600 mb-2 sm:mb-3 line-clamp-2">
          {product.specs}
        </p>
        
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4 text-xs sm:text-sm">
          <div>
            <span className="text-secondary-500">MOQ:</span>
            <span className="ml-1 font-medium">{product.moq}</span>
          </div>
          <div>
            <span className="text-secondary-500">Lead Time:</span>
            <span className="ml-1 font-medium">{product.leadTime}</span>
          </div>
          <div>
            <span className="text-secondary-500">Price:</span>
            <span className="ml-1 font-medium text-primary-600">{product.price}</span>
          </div>
          <div>
            <span className="text-secondary-500">HS Code:</span>
            <span className="ml-1 font-medium">{product.hsCode}</span>
          </div>
        </div>
        
        {product.variants && product.variants.length > 0 && (
          <div className="mb-4">
            <span className="text-sm text-secondary-500">Variants:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {product.variants.map((variant, index) => (
                <Badge key={index} variant="default" size="xs">
                  {variant}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-3 sm:pt-4 border-t border-secondary-200 gap-2 sm:gap-0">
          <div className="flex items-center text-xs sm:text-sm text-secondary-500">
            <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            <span>245 views</span>
          </div>
          
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onView && onView(product.id);
              }}
              className="flex-1 sm:flex-initial text-xs px-2 py-1.5"
            >
              <Eye className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
              <span className="hidden sm:inline">View</span>
            </Button>
            <Link href={`/products/edit/${product.id}`} className="flex-1 sm:flex-initial">
              <Button variant="outline" size="sm" className="w-full text-xs px-2 py-1.5">
                <Edit className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            </Link>
            <Button 
              variant="danger" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete && onDelete(product.id);
              }}
              className="flex-1 sm:flex-initial text-xs px-2 py-1.5"
            >
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
