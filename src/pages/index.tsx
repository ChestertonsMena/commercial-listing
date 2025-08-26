import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { Search, Filter, MapPin, Bed, Square, ChevronLeft, ChevronRight, X, Phone, Mail, User, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import ChestertonsLogo from '@/assets/Chestertons-Logo.png';

// Import fallback images
import heroProperty1 from '@/assets/react.svg';
import heroProperty2 from '@/assets/react.svg';
import heroProperty3 from '@/assets/react.svg';

// Types
interface Property {
  id: string;
  title: string;
  price: number;
  area: number;
  bedrooms: number;
  community: string;
  images: string[];
  type: 'sale' | 'rent';
  propertyType: 'commercial' | 'residential';
  category?: string;
  agentName?: string;
}

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

interface LoadingState {
  sales: boolean;
  rent: boolean;
  salesComplete: boolean;
  rentComplete: boolean;
  salesError: boolean;
  rentError: boolean;
}

// Target communities - only these 3 will be shown
const TARGET_COMMUNITIES = [
  'Business Bay',
  'Motor City',
  'Barsha Heights'
];

// CORS proxy URLs for XML fetching - optimized order
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

// Function to identify commercial categories
const isCommercialCategory = (category: string): boolean => {
  const commercialPatterns = [
    'office', 'retail', 'commercial', 'shop', 'warehouse', 'industrial',
    'business', 'clinic', 'medical', 'restaurant', 'cafe', 'hotel',
    'showroom', 'mall', 'plaza', 'center', 'building', 'studio',
    'workspace', 'laboratory', 'workshop', 'factory', 'logistics', 'storage'
  ];

  const categoryLower = category.toLowerCase();
  return commercialPatterns.some(pattern => categoryLower.includes(pattern));
};

// Property Card Skeleton Component
const PropertyCardSkeleton = () => (
  <Card className="overflow-hidden bg-gradient-card shadow-card border-2">
    <div className="relative h-64 overflow-hidden">
      <Skeleton className="w-full h-full" />
    </div>
    <CardContent className="p-6">
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-8 w-1/2 mb-4" />
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center">
          <Skeleton className="h-4 w-4 mr-1" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center">
          <Skeleton className="h-4 w-4 mr-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <Skeleton className="h-4 w-24 mb-4" />
      <Skeleton className="h-10 w-full" />
    </CardContent>
  </Card>
);

// Optimized XML parsing - process in chunks
const parseXMLPropertiesOptimized = async (xmlString: string, type: 'sale' | 'rent'): Promise<Property[]> => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      console.error('XML parsing error:', parserError.textContent);
      return [];
    }

    const properties: Property[] = [];
    const propertyElements = xmlDoc.querySelectorAll('UnitDTO, Property, property, PropertyInfo');

    // Process in smaller chunks for better performance
    const processChunk = async (elements: Element[], startIndex: number, chunkSize: number) => {
      const endIndex = Math.min(startIndex + chunkSize, elements.length);

      for (let i = startIndex; i < endIndex; i++) {
        const element = elements[i];

        try {
          const getFieldValue = (fieldNames: string[]): string => {
            for (const fieldName of fieldNames) {
              const field = element.querySelector(fieldName);
              if (field && field.textContent?.trim()) {
                return field.textContent.trim();
              }
            }
            return '';
          };

          const category = getFieldValue(['Category', 'PropertyCategory', 'PropertyType', 'UnitCategory', 'Type']);

          // Only process commercial properties
          if (!category || !isCommercialCategory(category)) {
            continue;
          }

          const community = getFieldValue(['Community', 'CommunityName', 'Location', 'Area']);

          // Community mappings
          const communityMappings: { [key: string]: string } = {
            'dubai investment park (dip)': 'Motor City',
            'dubai investment park': 'Motor City',
            'business bay': 'Business Bay',
            'motor city': 'Motor City',
            'barsha heights': 'Barsha Heights',
            'al barsha heights': 'Barsha Heights'
          };

          const normalizedCommunity = community.toLowerCase();
          const mappedCommunity = Object.keys(communityMappings).find(key =>
            normalizedCommunity.includes(key)
          );

          const finalCommunity = mappedCommunity ? communityMappings[mappedCommunity] : community;

          const isTargetCommunity = TARGET_COMMUNITIES.some(targetCommunity =>
            finalCommunity.toLowerCase().includes(targetCommunity.toLowerCase()) ||
            targetCommunity.toLowerCase().includes(finalCommunity.toLowerCase())
          );

          if (!isTargetCommunity) {
            continue;
          }

          const title = getFieldValue(['PropertyName', 'PropertyTitle', 'Title', 'Name']) || `Property ${i + 1}`;

          const priceStr = type === 'sale'
            ? getFieldValue(['SellPrice', 'Price', 'PropertyPrice', 'SalePrice'])
            : getFieldValue(['Rent', 'RentPrice', 'Price', 'PropertyPrice']);
          const areaStr = getFieldValue(['BuiltupArea', 'FloorArea', 'Area', 'PropertyArea', 'TotalArea']);
          const bedroomsStr = getFieldValue(['Bedrooms', 'BedroomCount', 'NumberOfBedrooms']);
          
          // Extract agent information
          const agentName = getFieldValue([
            'AgentName', 'Agent', 'ListedBy', 'ContactPerson', 
            'SalesAgent', 'ListingAgent', 'PropertyAgent', 'AgentFirstName',
            'ContactName', 'ResponsibleAgent', 'AgentFullName'
          ]) || 'Chestertons Agent';

          const price = parseFloat(priceStr.replace(/[^\d.]/g, '')) || 0;
          const area = parseFloat(areaStr.replace(/[^\d.]/g, '')) || 800;
          const bedrooms = parseInt(bedroomsStr) || 0;

          // Extract images
          let images: string[] = [];
          const imagesContainer = element.querySelector('Images');
          if (imagesContainer) {
            const imageElements = imagesContainer.querySelectorAll('Image ImageURL, Image > ImageURL');
            images = Array.from(imageElements)
              .map(img => img.textContent?.trim())
              .filter(Boolean) as string[];
          }

          const fallbackImages = [heroProperty1, heroProperty2, heroProperty3];
          const finalImages = images.length > 0 ? images.slice(0, 5) : fallbackImages; // Limit to 5 images

          if (price > 0) {
            properties.push({
              id: `${type}-${Date.now()}-${i}`,
              title,
              price,
              area,
              bedrooms,
              community: finalCommunity,
              images: finalImages,
              type,
              propertyType: 'commercial',
              category: category,
              agentName: agentName
            });
          }
        } catch (error) {
          console.error('Error parsing property element:', error);
        }
      }
    };

    // Process in chunks of 50 for better performance
    const elements = Array.from(propertyElements);
    const chunkSize = 50;
    for (let i = 0; i < Math.min(elements.length, 300); i += chunkSize) { // Limit to first 300 elements
      await processChunk(elements, i, chunkSize);

      // Allow other operations to run
      if (i % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return properties;
  } catch (error) {
    console.error('Error parsing XML:', error);
    return [];
  }
};

// Optimized fetch with faster timeout and better error handling
const fetchXMLDataOptimized = async (url: string, type: 'sale' | 'rent'): Promise<Property[]> => {
  const fetchWithTimeout = async (proxyUrl: string, timeout: number = 8000): Promise<Property[] | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${proxyUrl}${encodeURIComponent(url)}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/xml, text/xml, */*' },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const xmlText = await response.text();
        console.log(`Successfully fetched ${type} listings via ${proxyUrl}`);
        const properties = await parseXMLPropertiesOptimized(xmlText, type);
        console.log(`Parsed ${properties.length} ${type} commercial properties`);
        return properties;
      }
    } catch (error) {
      console.error(`Failed to fetch via ${proxyUrl}:`, error);
    }
    return null;
  };

  // Try proxies sequentially (faster than parallel for this case)
  for (const proxy of CORS_PROXIES) {
    const result = await fetchWithTimeout(proxy);
    if (result && result.length > 0) {
      return result;
    }
  }

  console.warn(`Failed to fetch ${type} listings from all proxies`);
  return [];
};

// Memoized PropertyCard component
const PropertyCard = memo(({
  property,
  currentIndex,
  onPrevImage,
  onNextImage,
  onImageIndexChange,
  onImageLoad,
  onSelectProperty,
  isImageLoaded,
  formatPrice
}: {
  property: Property;
  currentIndex: number;
  onPrevImage: () => void;
  onNextImage: () => void;
  onImageIndexChange: (index: number) => void;
  onImageLoad: (src: string) => void;
  onSelectProperty: (property: Property) => void;
  isImageLoaded: boolean;
  formatPrice: (price: number) => string;
}) => {
  return (
    <Card className="overflow-hidden bg-gradient-card shadow-card hover:shadow-glow transition-all duration-300 border-2 hover:border-primary group transform-gpu will-change-transform">
      <div className="relative h-64 overflow-hidden">
        {!isImageLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <img
          src={property.images[currentIndex]}
          alt={property.title}
          loading="lazy"
          className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${isImageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          onLoad={() => onImageLoad(property.images[currentIndex])}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = heroProperty1;
            onImageLoad(heroProperty1);
          }}
        />

        {property.images.length > 1 && isImageLoaded && (
          <>
            <button
              onClick={onPrevImage}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-primary/80 hover:bg-primary text-primary-foreground rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={onNextImage}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary/80 hover:bg-primary text-primary-foreground rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
              {property.images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => onImageIndexChange(index)}
                  className={`w-2 h-2 rounded-full transition-colors duration-200 ${index === currentIndex ? 'bg-primary' : 'bg-primary-foreground/50'
                    }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <CardContent className="p-6">
        <h3 className="text-xl font-semibold text-foreground mb-2">{property.title}</h3>

        <div className="text-2xl font-bold text-primary mb-4">
          {formatPrice(property.price)}
          {property.type === 'rent' && <span className="text-sm font-normal text-muted-foreground">/year</span>}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Square className="h-4 w-4 mr-1" />
            {property.area} sq ft
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            {property.community}
          </div>
        </div>

        {property.category && (
          <div className="text-sm text-muted-foreground mb-4">
            Category: <span className="font-medium">{property.category}</span>
          </div>
        )}

        {property.agentName && (
          <div className="text-sm text-muted-foreground mb-4 flex items-center">
            <User className="h-3 w-3 mr-1" />
            Listed by: <span className="font-medium ml-1 text-primary">{property.agentName}</span>
          </div>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <Button
              className="w-full bg-gradient-purple hover:shadow-glow transition-all duration-300"
              onClick={() => onSelectProperty(property)}
            >
              View Details & Contact
            </Button>
          </DialogTrigger>
        </Dialog>
      </CardContent>
    </Card>
  );
});

PropertyCard.displayName = 'PropertyCard';

const RealEstateListings = () => {
  // State management
  const [salesProperties, setSalesProperties] = useState<Property[]>([]);
  const [rentProperties, setRentProperties] = useState<Property[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    sales: true,
    rent: false,
    salesComplete: false,
    rentComplete: false,
    salesError: false,
    rentError: false
  });
  const [dataSource, setDataSource] = useState<'api' | 'error'>('api');
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState([0, 5000000]);
  const [areaRange, setAreaRange] = useState([0, 2000]);
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('any');
  const [activeTab, setActiveTab] = useState<'sale' | 'rent'>('sale');
  const [activeCommunity, setActiveCommunity] = useState<string>('Business Bay');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [contactForm, setContactForm] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const { toast } = useToast();

  // Image slider states
  const [currentImageIndex, setCurrentImageIndex] = useState<{ [key: string]: number }>({});
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  // PROGRESSIVE DATA LOADING - Sales first, then rentals
  useEffect(() => {
    const loadSalesData = async () => {
      try {    
        console.log('Loading commercial sales properties...');
        const salesUrl = 'http://webapi.goyzer.com/Company.asmx/SalesListings?AccessCode=50!@Chestertons!29&GroupCode=5029&Bedrooms=&StartPriceRange=&EndPriceRange=&CategoryID=&SpecialProjects=&CountryID=&StateID=&CommunityID=&DistrictID=&FloorAreaMin=&FloorAreaMax=&UnitCategory=&UnitID=&BedroomsMax=&PropertyID=&ReadyNow=&PageIndex=&';

        const salesProps = await fetchXMLDataOptimized(salesUrl, 'sale');

        if (salesProps.length > 0) {
          console.log(`Loaded ${salesProps.length} sales properties`);
          setSalesProperties(salesProps);
          setDataSource('api');
          setLoadingState(prev => ({ ...prev, sales: false, salesComplete: true }));
          
          // Use the exact same filtering logic as used in the main app
          setTimeout(() => {
            const targetCommunitySalesCount = salesProps.filter(p => {
              // Must be commercial (this filter is already applied in parsing, but double-check)
              if (p.propertyType !== 'commercial') return false;
              // Use the same community matching logic as the main app
              return TARGET_COMMUNITIES.some(targetCommunity =>
                p.community.toLowerCase().includes(targetCommunity.toLowerCase()) ||
                targetCommunity.toLowerCase().includes(p.community.toLowerCase())
              );
            }).length;
            
            toast({
              title: "Sales Properties Loaded",
              description: `Found Sales commercial properties for sale in target areas`
            });
          }, 100);
        } else {
          console.warn('No sales properties found');
          setLoadingState(prev => ({ ...prev, sales: false, salesComplete: true, salesError: true }));
          setDataSource('error');
          toast({
            title: "No Sales Properties Found",
            description: "Could not find any commercial properties for sale in the target areas",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error loading sales data:', error);
        setLoadingState(prev => ({ ...prev, sales: false, salesComplete: true, salesError: true }));
        setDataSource('error');
        toast({
          title: "Error Loading Sales Data",
          description: "Failed to load commercial properties for sale",
          variant: "destructive"
        });
      } finally {
        // Start loading rentals after sales complete
        loadRentalsData();
      }
    };

    const loadRentalsData = async () => {
      setLoadingState(prev => ({ ...prev, rent: true }));

      try {
        console.log('Loading commercial rental properties...');
        const rentUrl = 'http://webapi.goyzer.com/Company.asmx/RentListings?AccessCode=50!@Chestertons!29&GroupCode=5029&PropertyType=&Bedrooms=&StartPriceRange=&EndPriceRange=&categoryID=&CountryID=&StateID=&CommunityID=&FloorAreaMin=&FloorAreaMax=&UnitCategory=&UnitID=&BedroomsMax=&PropertyID=&ReadyNow=&PageIndex=&';

        const rentProps = await fetchXMLDataOptimized(rentUrl, 'rent');

        if (rentProps.length > 0) {
          console.log(`Loaded ${rentProps.length} rental properties`);
          setRentProperties(rentProps);
          setLoadingState(prev => ({ ...prev, rent: false, rentComplete: true }));
          
          // Use the exact same filtering logic as used in the main app  
          setTimeout(() => {
            const targetCommunityRentCount = rentProps.filter(p => {
              // Must be commercial (this filter is already applied in parsing, but double-check)
              if (p.propertyType !== 'commercial') return false;
              // Use the same community matching logic as the main app
              return TARGET_COMMUNITIES.some(targetCommunity =>
                p.community.toLowerCase().includes(targetCommunity.toLowerCase()) ||
                targetCommunity.toLowerCase().includes(p.community.toLowerCase())
              );
            }).length;
            
            toast({
              title: "Rental Properties Loaded", 
              description: `Found Rental commercial properties for rent in target areas`
            });
          }, 100);
        } else {
          console.warn('No rental properties found');
          setLoadingState(prev => ({ ...prev, rent: false, rentComplete: true, rentError: true }));
          toast({
            title: "No Rental Properties Found",
            description: "Could not find any commercial properties for rent in the target areas",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error loading rental data:', error);
        setLoadingState(prev => ({ ...prev, rent: false, rentComplete: true, rentError: true }));
        toast({
          title: "Error Loading Rental Data",
          description: "Failed to load commercial properties for rent",
          variant: "destructive"
        });
      }
    };

    // Start with sales data immediately
    loadSalesData();
  }, [toast]);

  // Get current properties based on active tab
  const currentProperties = activeTab === 'sale' ? salesProperties : rentProperties;
  const isCurrentTabLoading = activeTab === 'sale' ? loadingState.sales : loadingState.rent;

  // Filter properties
  const filteredProperties = useMemo(() => {
    return currentProperties.filter(property => {
      // Commercial filter
      if (property.propertyType !== 'commercial') return false;

      // Search filter
      if (searchTerm && !property.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !property.community.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(property.category && property.category.toLowerCase().includes(searchTerm.toLowerCase()))) {
        return false;
      }

      // Price filter
      if (property.price < priceRange[0] || property.price > priceRange[1]) {
        return false;
      }

      // Area filter
      if (property.area < areaRange[0] || property.area > areaRange[1]) {
        return false;
      }

      // Property type filter
      if (selectedPropertyType && selectedPropertyType !== 'any' &&
        property.category && !property.category.toLowerCase().includes(selectedPropertyType)) {
        return false;
      }

      return true;
    });
  }, [currentProperties, searchTerm, priceRange, areaRange, selectedPropertyType]);

  // Get only properties that match target communities for display
  const targetCommunityProperties = useMemo(() => {
    return filteredProperties.filter(property => {
      return TARGET_COMMUNITIES.some(targetCommunity =>
        property.community.toLowerCase().includes(targetCommunity.toLowerCase()) ||
        targetCommunity.toLowerCase().includes(property.community.toLowerCase())
      );
    });
  }, [filteredProperties]);

  // Group properties by community
  const propertiesByCommunity = useMemo(() => {
    const grouped: { [key: string]: Property[] } = {};

    TARGET_COMMUNITIES.forEach(community => {
      grouped[community] = targetCommunityProperties.filter(p => p.community === community);
    });

    return grouped;
  }, [targetCommunityProperties]);

  // Get current community properties
  const currentCommunityProperties = propertiesByCommunity[activeCommunity] || [];

  // Image navigation handlers
  const nextImage = useCallback((propertyId: string, totalImages: number) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [propertyId]: ((prev[propertyId] || 0) + 1) % totalImages
    }));
  }, []);

  const prevImage = useCallback((propertyId: string, totalImages: number) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [propertyId]: ((prev[propertyId] || 0) - 1 + totalImages) % totalImages
    }));
  }, []);

  const handleImageLoad = useCallback((imageSrc: string) => {
    setLoadedImages(prev => new Set(prev).add(imageSrc));
  }, []);

  // Contact form submission
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;

    setIsSubmittingContact(true);

    try {
      const webhookData = {
        contact_name: contactForm.name,
        contact_email: contactForm.email,
        contact_phone: contactForm.phone,
        contact_message: contactForm.message,
        property_id: selectedProperty.id,
        property_title: selectedProperty.title,
        property_price: `AED ${selectedProperty.price.toLocaleString()}`,
        property_area: `${selectedProperty.area} sq ft`,
        property_community: selectedProperty.community,
        property_type: selectedProperty.type,
        property_category: selectedProperty.category,
        agent_name: selectedProperty.agentName || 'Chestertons Agent',
        timestamp: new Date().toISOString(),
        source: 'Real Estate Listings App'
      };

      await fetch('https://hooks.zapier.com/hooks/catch/21352187/utgtlkb/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify(webhookData)
      });

      toast({
        title: "Inquiry Sent Successfully",
        description: "Thank you for your interest! We'll contact you soon."
      });

      setContactForm({ name: '', email: '', phone: '', message: '' });
      setSelectedProperty(null);

    } catch (error) {
      console.error('Error submitting contact form:', error);
      toast({
        title: "Error",
        description: "Failed to send inquiry. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setPriceRange([0, 5000000]);
    setAreaRange([0, 2000]);
    setSelectedPropertyType('any');
  };

  const formatPrice = (price: number) => {
    return `AED ${price.toLocaleString()}`;
  };

  // Loading Indicators
  const LoadingIndicator = ({ type, isLoading }: { type: string; isLoading: boolean }) => {
    if (!isLoading) return null;

    return (
      <div className="fixed top-4 right-4 z-50">
        <Card className="p-4 shadow-lg border-2 border-primary bg-white">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm font-medium">Loading {type}...</span>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <LoadingIndicator
        type={activeTab === 'sale' ? 'commercial sales' : 'commercial rentals'}
        isLoading={isCurrentTabLoading}
      />

      {/* Header */}
      <header className="bg-gradient-purple shadow-purple">
        <div className="container mx-auto px-4 py-2">
          <div className="text-center">
            <img
              src={ChestertonsLogo}
              alt="Chestertons Logo"
              className="mx-auto"
              style={{ maxWidth: '160px' }}
            />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <Card className="mb-8 bg-gradient-card shadow-card border-2">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-4 ">
              <div className="space-y-8 relative lg:col-span-1">
                <Search className="absolute left-3 top-[3.25rem] transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
                <Input
                  placeholder="Search properties, communities, or categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-2 focus:ring-primary focus:border-primary h-10"
                />
              </div>

              {/* Price Range */}
              <div className="space-y-6 lg:col-span-1">
                <Label className="text-sm font-medium">Price Range</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0"
                    max="5000000"
                    step="50000"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                    className="flex-1"
                  />
                  <input
                    type="range"
                    min="0"
                    max="5000000"
                    step="50000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="flex-1"
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
                </div>
              </div>

              {/* Area Range */}
              <div className="space-y-6 lg:col-span-1">
                <Label className="text-sm font-medium">Area (sq ft)</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    step="50"
                    value={areaRange[0]}
                    onChange={(e) => setAreaRange([parseInt(e.target.value), areaRange[1]])}
                    className="flex-1"
                  />
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    step="50"
                    value={areaRange[1]}
                    onChange={(e) => setAreaRange([areaRange[0], parseInt(e.target.value)])}
                    className="flex-1"
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {areaRange[0]} - {areaRange[1]} sq ft
                </div>
              </div>

              {/* Property Type */}
              <div className="space-y-2 lg:col-span-1">
                <Label className="text-sm font-medium">Property Type</Label>
                <Select value={selectedPropertyType} onValueChange={setSelectedPropertyType}>
                  <SelectTrigger className="border-2 focus:ring-primary focus:border-primary h-10">
                    <SelectValue placeholder="All Commercial" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">All Commercial</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="showroom">Showroom</SelectItem>
                    <SelectItem value="clinic">Medical/Clinic</SelectItem>
                    <SelectItem value="restaurant">Restaurant/Cafe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  <span>Showing {targetCommunityProperties.length} commercial properties</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={clearFilters} size="sm">
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs - Sale/Rent */}
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value as 'sale' | 'rent');
          // Reset to first community when switching between sale/rent
          setActiveCommunity('Business Bay');
        }} className="mb-8">
          <TabsList className="grid w-full grid-cols-2 bg-gradient-card border-2">
            <TabsTrigger value="sale" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Commercial Sales ({activeTab === 'sale' ? targetCommunityProperties.length : 
                salesProperties.filter(p => {
                  // Apply same filtering logic for accurate count
                  if (p.propertyType !== 'commercial') return false;
                  if (searchTerm && !p.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
                    !p.community.toLowerCase().includes(searchTerm.toLowerCase()) &&
                    !(p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))) {
                    return false;
                  }
                  if (p.price < priceRange[0] || p.price > priceRange[1]) return false;
                  if (p.area < areaRange[0] || p.area > areaRange[1]) return false;
                  if (selectedPropertyType && selectedPropertyType !== 'any' &&
                    p.category && !p.category.toLowerCase().includes(selectedPropertyType)) {
                    return false;
                  }
                  return TARGET_COMMUNITIES.some(targetCommunity =>
                    p.community.toLowerCase().includes(targetCommunity.toLowerCase()) ||
                    targetCommunity.toLowerCase().includes(p.community.toLowerCase())
                  );
                }).length})
            </TabsTrigger>
            <TabsTrigger value="rent" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Commercial Rentals ({activeTab === 'rent' ? targetCommunityProperties.length : 
                rentProperties.filter(p => {
                  // Apply same filtering logic for accurate count
                  if (p.propertyType !== 'commercial') return false;
                  if (searchTerm && !p.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
                    !p.community.toLowerCase().includes(searchTerm.toLowerCase()) &&
                    !(p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))) {
                    return false;
                  }
                  if (p.price < priceRange[0] || p.price > priceRange[1]) return false;
                  if (p.area < areaRange[0] || p.area > areaRange[1]) return false;
                  if (selectedPropertyType && selectedPropertyType !== 'any' &&
                    p.category && !p.category.toLowerCase().includes(selectedPropertyType)) {
                    return false;
                  }
                  return TARGET_COMMUNITIES.some(targetCommunity =>
                    p.community.toLowerCase().includes(targetCommunity.toLowerCase()) ||
                    targetCommunity.toLowerCase().includes(p.community.toLowerCase())
                  );
                }).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {/* Community Tabs */}
            <Tabs value={activeCommunity} onValueChange={setActiveCommunity} className="mb-6">
              <TabsList className="grid w-full grid-cols-3 bg-gradient-card border-2">
                {TARGET_COMMUNITIES.map(community => {
                  // Get filtered count for this specific community and current tab
                  const communityCount = targetCommunityProperties.filter(p => p.community === community).length;
                  return (
                    <TabsTrigger 
                      key={community} 
                      value={community}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {community} ({communityCount})
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {TARGET_COMMUNITIES.map(community => (
                <TabsContent key={community} value={community} className="mt-6">
                  {/* Show loading skeletons while loading */}
                  {isCurrentTabLoading && currentProperties.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <PropertyCardSkeleton key={`${community}-skeleton-${index}`} />
                      ))}
                    </div>
                  ) : propertiesByCommunity[community]?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {propertiesByCommunity[community].map((property) => {
                        const currentIndex = currentImageIndex[property.id] || 0;
                        const isImageLoaded = loadedImages.has(property.images[currentIndex]);

                        return (
                          <PropertyCard
                            key={property.id}
                            property={property}
                            currentIndex={currentIndex}
                            onPrevImage={() => prevImage(property.id, property.images.length)}
                            onNextImage={() => nextImage(property.id, property.images.length)}
                            onImageIndexChange={(index) => setCurrentImageIndex(prev => ({ ...prev, [property.id]: index }))}
                            onImageLoad={handleImageLoad}
                            onSelectProperty={setSelectedProperty}
                            isImageLoaded={isImageLoaded}
                            formatPrice={formatPrice}
                          />
                        );
                      })}
                    </div>
                  ) : !isCurrentTabLoading ? (
                    <div className="text-center py-12">
                      <div className="text-muted-foreground text-lg mb-4">
                        {activeTab === 'sale' && loadingState.salesError ?
                          `Failed to load commercial properties for sale in ${community}. Please try refreshing the page.` :
                          activeTab === 'rent' && loadingState.rentError ?
                            `Failed to load commercial properties for rent in ${community}. Please try refreshing the page.` :
                            `No commercial properties found in ${community} matching your criteria.`
                        }
                      </div>
                      {((activeTab === 'sale' && loadingState.salesError) ||
                        (activeTab === 'rent' && loadingState.rentError)) ? (
                        <Button onClick={() => window.location.reload()} className="mt-4">
                          Refresh Page
                        </Button>
                      ) : (
                        <Button onClick={clearFilters} className="mt-4">Clear Filters</Button>
                      )}
                    </div>
                  ) : null}
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>
        </Tabs>

        {/* Contact Modal */}
        <Dialog open={selectedProperty !== null} onOpenChange={(open) => !open && setSelectedProperty(null)}>
          <DialogContent className="max-w-2xl bg-gradient-card border-2">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-primary">
                Contact Us About {selectedProperty?.title}
              </DialogTitle>
              <DialogClose />
            </DialogHeader>

            {selectedProperty && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Property Details */}
                <div>
                  <img
                    src={selectedProperty.images[0]}
                    alt={selectedProperty.title}
                    loading="lazy"
                    className="w-full h-48 object-cover rounded-lg mb-4"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = heroProperty1;
                    }}
                  />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-semibold text-primary">{formatPrice(selectedProperty.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Area:</span>
                      <span className="font-semibold">{selectedProperty.area} sq ft</span>
                    </div>
                    {selectedProperty.category && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Category:</span>
                        <span className="font-semibold">{selectedProperty.category}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Community:</span>
                      <span className="font-semibold">{selectedProperty.community}</span>
                    </div>
                    {selectedProperty.agentName && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Listed by:</span>
                        <span className="font-semibold">{selectedProperty.agentName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Form */}
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      Name *
                    </Label>
                    <Input
                      id="name"
                      value={contactForm.name}
                      onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="border-2 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                      className="border-2 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      Phone *
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                      required
                      className="border-2 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div>
                    <Label htmlFor="message" className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Message
                    </Label>
                    <Textarea
                      id="message"
                      value={contactForm.message}
                      onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Tell us about your commercial property requirements..."
                      className="border-2 focus:ring-primary focus:border-primary"
                      rows={3}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmittingContact}
                    className="w-full bg-gradient-purple hover:shadow-glow transition-all duration-300"
                  >
                    {isSubmittingContact ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending Inquiry...
                      </>
                    ) : (
                      'Send Inquiry'
                    )}
                  </Button>
                </form>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default RealEstateListings;