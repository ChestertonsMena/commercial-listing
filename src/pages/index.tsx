import React, { useState, useEffect, useMemo, memo, useCallback, lazy, Suspense } from 'react';
import { Search, Filter, MapPin, Bed, Square, ChevronLeft, ChevronRight, X, Phone, Mail, User, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

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
}

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

// Target communities
const TARGET_COMMUNITIES = [
  'Business Bay',
  'Motor City', 
  'Barsha Heights'
];

// CORS proxy URLs for XML fetching
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://cors-anywhere.herokuapp.com/',
];

// Mock data as fallback
const MOCK_PROPERTIES: Property[] = [
  {
    id: '1',
    title: 'Control Tower',
    price: 2500000,
    area: 1200,
    bedrooms: 2,
    community: 'Business Bay',
    images: [heroProperty1, heroProperty2, heroProperty3],
    type: 'sale'
  },
  {
    id: '2',
    title: 'Marina Pinnacle',
    price: 180000,
    area: 950,
    bedrooms: 1,
    community: 'Motor City',
    images: [heroProperty2, heroProperty3, heroProperty1],
    type: 'rent'
  },
  {
    id: '3',
    title: 'Downtown Heights',
    price: 3200000,
    area: 1500,
    bedrooms: 3,
    community: 'Downtown Dubai',
    images: [heroProperty3, heroProperty1, heroProperty2],
    type: 'sale'
  },
  {
    id: '4',
    title: 'Barsha Residences',
    price: 120000,
    area: 800,
    bedrooms: 1,
    community: 'Barsha Heights',
    images: [heroProperty1, heroProperty3, heroProperty2],
    type: 'rent'
  },
  {
    id: '5',
    title: 'Bay Square',
    price: 1800000,
    area: 1000,
    bedrooms: 2,
    community: 'Business Bay',
    images: [heroProperty2, heroProperty1, heroProperty3],
    type: 'sale'
  },
  {
    id: '6',
    title: 'Green Community',
    price: 95000,
    area: 750,
    bedrooms: 1,
    community: 'Motor City',
    images: [heroProperty3, heroProperty2, heroProperty1],
    type: 'rent'
  }
];

// Memoized PropertyCard component for better performance
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
      {/* Image Slider */}
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
          className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
            isImageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => onImageLoad(property.images[currentIndex])}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = heroProperty1;
            onImageLoad(heroProperty1);
          }}
        />
        
        {/* Image Navigation */}
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
            
            {/* Dots Indicator */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
              {property.images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => onImageIndexChange(index)}
                  className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                    index === currentIndex ? 'bg-primary' : 'bg-primary-foreground/50'
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

        <div className="grid grid-cols-3 gap-4 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Square className="h-4 w-4 mr-1" />
            {property.area} sq ft
          </div>
          <div className="flex items-center">
            <Bed className="h-4 w-4 mr-1" />
            {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            {property.community}
          </div>
        </div>

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
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState([0, 5000000]);
  const [areaRange, setAreaRange] = useState([0, 2000]);
  const [selectedBedrooms, setSelectedBedrooms] = useState<string>('any');
  const [activeTab, setActiveTab] = useState<'sale' | 'rent'>('sale');
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
  
  // Image loading states
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  // Parse XML to Property objects
  const parseXMLProperties = (xmlString: string, type: 'sale' | 'rent'): Property[] => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      
      // Check for XML parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        console.error('XML parsing error:', parserError.textContent);
        return [];
      }

      const properties: Property[] = [];
      const propertyElements = xmlDoc.querySelectorAll('UnitDTO, Property, property, PropertyInfo');

      propertyElements.forEach((element, index) => {
        try {
          // Extract fields with multiple possible names
          const getFieldValue = (fieldNames: string[]): string => {
            for (const fieldName of fieldNames) {
              const field = element.querySelector(fieldName);
              if (field && field.textContent?.trim()) {
                return field.textContent.trim();
              }
            }
            return '';
          };

          const title = getFieldValue(['PropertyName', 'PropertyTitle', 'Title', 'Name']) || `Property ${index + 1}`;
          // For sales: SellPrice, for rentals: Rent
          const priceStr = type === 'sale' 
            ? getFieldValue(['SellPrice', 'Price', 'PropertyPrice', 'SalePrice'])
            : getFieldValue(['Rent', 'RentPrice', 'Price', 'PropertyPrice']);
          const areaStr = getFieldValue(['BuiltupArea', 'FloorArea', 'Area', 'PropertyArea', 'TotalArea']);
          const community = getFieldValue(['Community', 'CommunityName', 'Location', 'Area']);
          const bedroomsStr = getFieldValue(['Bedrooms', 'BedroomCount', 'NumberOfBedrooms']);

          // Parse numeric values
          const price = parseFloat(priceStr.replace(/[^\d.]/g, '')) || 0;
          const area = parseFloat(areaStr.replace(/[^\d.]/g, '')) || 800;
          const bedrooms = parseInt(bedroomsStr) || 1;

          // Extract images - handle nested structure
          let images: string[] = [];
          const imagesContainer = element.querySelector('Images');
          if (imagesContainer) {
            const imageElements = imagesContainer.querySelectorAll('Image ImageURL, Image > ImageURL');
            images = Array.from(imageElements)
              .map(img => img.textContent?.trim())
              .filter(Boolean) as string[];
          } else {
            // Fallback to direct image elements
            const imageElements = element.querySelectorAll('Image, PropertyImage, ImageURL, Photo');
            images = Array.from(imageElements)
              .map(img => img.textContent?.trim())
              .filter(Boolean) as string[];
          }

          // Use fallback images if no images found
          const fallbackImages = [heroProperty1, heroProperty2, heroProperty3];
          const finalImages = images.length > 0 ? images : fallbackImages;

          // Filter by target communities (case-insensitive) - handle "Dubai Investment Park" mapping
          const communityMappings: { [key: string]: string } = {
            'dubai investment park (dip)': 'Motor City', // Map DIP to Motor City for demo
            'dubai investment park': 'Motor City',
            'business bay': 'Business Bay',
            'motor city': 'Motor City', 
            'barsha heights': 'Barsha Heights'
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

          if (isTargetCommunity && price > 0) {
            properties.push({
              id: `${type}-${index}`,
              title,
              price,
              area,
              bedrooms: bedrooms || 1, // Default to 1 if no bedrooms specified
              community: finalCommunity,
              images: finalImages,
              type
            });
          }
        } catch (error) {
          console.error('Error parsing property element:', error);
        }
      });

      return properties;
    } catch (error) {
      console.error('Error parsing XML:', error);
      return [];
    }
  };

  // Fetch XML data with CORS fallback
  const fetchXMLData = async (url: string, type: 'sale' | 'rent'): Promise<Property[]> => {
    for (const proxy of CORS_PROXIES) {
      try {
        console.log(`Attempting to fetch ${type} listings via proxy: ${proxy}`);
        const response = await fetch(`${proxy}${encodeURIComponent(url)}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/xml, text/xml, */*',
          },
        });

        if (response.ok) {
          const xmlText = await response.text();
          console.log(`Successfully fetched ${type} listings XML data`);
          const properties = parseXMLProperties(xmlText, type);
          console.log(`Parsed ${properties.length} ${type} properties`);
          return properties;
        }
      } catch (error) {
        console.error(`Failed to fetch via proxy ${proxy}:`, error);
      }
    }

    console.warn(`Failed to fetch ${type} listings from all proxies, using mock data`);
    return MOCK_PROPERTIES.filter(p => p.type === type);
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const salesUrl = 'http://webapi.goyzer.com/Company.asmx/SalesListings?AccessCode=50!@Chestertons!29&GroupCode=5029&Bedrooms=&StartPriceRange=&EndPriceRange=&CategoryID=&SpecialProjects=&CountryID=&StateID=&CommunityID=&DistrictID=&FloorAreaMin=&FloorAreaMax=&UnitCategory=&UnitID=&BedroomsMax=&PropertyID=&ReadyNow=&PageIndex=&';
        const rentUrl = 'http://webapi.goyzer.com/Company.asmx/RentListings?AccessCode=50!@Chestertons!29&GroupCode=5029&PropertyType=&Bedrooms=&StartPriceRange=&EndPriceRange=&categoryID=&CountryID=&StateID=&CommunityID=&FloorAreaMin=&FloorAreaMax=&UnitCategory=&UnitID=&BedroomsMax=&PropertyID=&ReadyNow=&PageIndex=&';

        const [salesProperties, rentProperties] = await Promise.all([
          fetchXMLData(salesUrl, 'sale'),
          fetchXMLData(rentUrl, 'rent')
        ]);

        const allProperties = [...salesProperties, ...rentProperties];
        
        // If no properties from API, use mock data
        if (allProperties.length === 0) {
          console.log('No properties from API, using mock data');
          setProperties(MOCK_PROPERTIES);
        } else {
          setProperties(allProperties);
        }
        
        toast({
          title: "Properties Loaded",
          description: `Successfully loaded ${allProperties.length || MOCK_PROPERTIES.length} properties`
        });
      } catch (error) {
        console.error('Error loading data:', error);
        setProperties(MOCK_PROPERTIES);
        toast({
          title: "Using Sample Data",
          description: "Could not connect to live data, showing sample properties",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toast]);

  // Filter properties based on search and filters
  const filteredProperties = useMemo(() => {
    return properties.filter(property => {
      // Tab filter
      if (property.type !== activeTab) return false;

      // Search filter
      if (searchTerm && !property.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !property.community.toLowerCase().includes(searchTerm.toLowerCase())) {
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

      // Bedrooms filter
      if (selectedBedrooms && selectedBedrooms !== 'any' && property.bedrooms.toString() !== selectedBedrooms) {
        return false;
      }

      return true;
    });
  }, [properties, activeTab, searchTerm, priceRange, areaRange, selectedBedrooms]);

  // Group properties by community
  const propertiesByCommunity = useMemo(() => {
    const grouped: { [key: string]: Property[] } = {};
    
    TARGET_COMMUNITIES.forEach(community => {
      grouped[community] = filteredProperties.filter(p => p.community === community);
    });

    return grouped;
  }, [filteredProperties]);

  // Handle image navigation with useCallback for performance
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

  // Handle image load
  const handleImageLoad = useCallback((imageSrc: string) => {
    setLoadedImages(prev => new Set(prev).add(imageSrc));
  }, []);

  // Handle contact form submission
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;

    setIsSubmittingContact(true);

    try {
      // Zapier webhook data
      const webhookData = {
        // Contact form data
        contact_name: contactForm.name,
        contact_email: contactForm.email,
        contact_phone: contactForm.phone,
        contact_message: contactForm.message,
        
        // Property details
        property_id: selectedProperty.id,
        property_title: selectedProperty.title,
        property_price: `AED ${selectedProperty.price.toLocaleString()}`,
        property_area: `${selectedProperty.area} sq ft`,
        property_bedrooms: selectedProperty.bedrooms,
        property_community: selectedProperty.community,
        property_type: selectedProperty.type,
        property_images: selectedProperty.images.join(', '),
        
        // Metadata
        timestamp: new Date().toISOString(),
        source: 'Real Estate Listings App',
        user_agent: navigator.userAgent,
        page_url: window.location.href
      };

      const response = await fetch('https://hooks.zapier.com/hooks/catch/21352187/utgtlkb/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: JSON.stringify(webhookData)
      });

      toast({
        title: "Inquiry Sent Successfully",
        description: "Thank you for your interest! We'll contact you soon."
      });

      // Reset form
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

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setPriceRange([0, 5000000]);
    setAreaRange([0, 2000]);
    setSelectedBedrooms('any');
  };

  // Format price for display
  const formatPrice = (price: number) => {
    return `AED ${price.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Loading Properties</h2>
          <p className="text-muted-foreground">Fetching the latest listings for you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-gradient-purple shadow-purple">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary-foreground mb-2">
              Chestertons - Commercial Listings
            </h1>
            <p className="text-primary-foreground/90 text-lg">
              Discover luxury properties in Dubai's most prestigious communities
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <Card className="mb-8 bg-gradient-card shadow-card border-2">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-4">
              {/* Search */}
              <div className="relative lg:col-span-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
                <Input
                  placeholder="Search properties or communities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-2 focus:ring-primary focus:border-primary h-10"
                />
              </div>

              {/* Price Range */}
              <div className="space-y-2 lg:col-span-1">
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
              <div className="space-y-2 lg:col-span-1">
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

              {/* Bedrooms */}
              <div className="space-y-2 lg:col-span-1">
                <Label className="text-sm font-medium">Bedrooms</Label>
                <Select value={selectedBedrooms} onValueChange={setSelectedBedrooms}>
                  <SelectTrigger className="border-2 focus:ring-primary focus:border-primary h-10">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="1">1 Bedroom</SelectItem>
                    <SelectItem value="2">2 Bedrooms</SelectItem>
                    <SelectItem value="3">3 Bedrooms</SelectItem>
                    <SelectItem value="4">4+ Bedrooms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>Showing {filteredProperties.length} properties</span>
              </div>
              <Button variant="outline" onClick={clearFilters} size="sm">
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'sale' | 'rent')} className="mb-8">
          <TabsList className="grid w-full grid-cols-2 bg-gradient-card border-2">
            <TabsTrigger value="sale" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Sales Listings
            </TabsTrigger>
            <TabsTrigger value="rent" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Rent Listings
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {TARGET_COMMUNITIES.map(community => {
              const communityProperties = propertiesByCommunity[community];
              if (communityProperties.length === 0) return null;

              return (
                <div key={community} className="mb-12">
                  <h2 className="text-2xl font-bold text-foreground mb-6 border-b-2 border-primary pb-2">
                    {community}
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {communityProperties.map((property) => {
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
                </div>
              );
            })}
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
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bedrooms:</span>
                      <span className="font-semibold">{selectedProperty.bedrooms}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Community:</span>
                      <span className="font-semibold">{selectedProperty.community}</span>
                    </div>
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
                      placeholder="Tell us about your requirements..."
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