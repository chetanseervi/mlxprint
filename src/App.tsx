/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  FileUp, 
  Printer, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Settings2,
  ChevronRight,
  CreditCard,
  Trash2,
  Plus,
  Truck,
  MapPin,
  User,
  Phone,
  LayoutDashboard,
  Download,
  ExternalLink,
  Clock,
  Search,
  CheckCircle,
  XCircle,
  CloudOff,
  RotateCcw,
  Image as PhotoIcon,
  Layers,
  Lock,
  LogOut
} from 'lucide-react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FileData {
  filename: string;
  originalName: string;
  pageCount: number;
}

interface OrderOptions {
  paperSize: string;
  paperType: string;
  colorMode: string;
}

interface Order {
  id: number;
  filename: string;
  original_name: string;
  page_count: number;
  paper_size: string;
  paper_type: string;
  color_mode: string;
  is_delivery: number;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  total_price: number;
  cloudinary_url: string | null;
  status: string;
  created_at: string;
  order_type?: string;
  cloudinary_public_id?: string;
  order_group_id?: string;
}

interface GroupedOrder {
  order_group_id: string;
  status: string;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  is_delivery: number;
  total_price: number;
  order_type?: string;
  files: Order[];
}

interface PriceRecord {
  id: number;
  paper_size: string;
  color_mode: string;
  paper_type: string;
  price: number;
}

const PAPER_CONFIG = {
  'A4': {
    'Black & White': [
      '70gsm Standard',
      'Bond Paper 100gsm'
    ],
    'Full Color': [
      '70gsm Standard',
      'Bond Paper 100gsm',
      'Photo Paper 135gsm',
      'Premium Photo Paper 180gsm',
      'Digital Photo Paper 270gsm'
    ]
  },
  'A3': {
    'Black & White': [
      '80gsm',
      '100gsm'
    ],
    'Full Color': [
      '80gsm',
      '100gsm'
    ]
  }
};

const PHOTO_SIZES = [
  'Passport size (8 nos)',
  'Passport (6 nos) + 4 Stamp size',
  '2x3 inch (2 nos)',
  '4x6 inch',
  '5x7 inch',
  '8x10 inch',
  'A4 Photo',
  'Custom Size'
];

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin@123') {
      localStorage.setItem('adminAuthenticated', 'true');
      onLogin();
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Login</h2>
          <p className="text-gray-500 mt-2">Enter your credentials to access the dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Username</label>
            <input 
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
              placeholder="Enter username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button 
            type="submit"
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-emerald-100"
          >
            Sign In
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => localStorage.getItem('adminAuthenticated') === 'true');
  const location = useLocation();
  const navigate = useNavigate();
  const [activeService, setActiveService] = useState<'documents' | 'photos' | 'pvc_card'>('documents');
  const [adminTab, setAdminTab] = useState<'orders' | 'prices'>('orders');
  const [files, setFiles] = useState<FileData[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [prices, setPrices] = useState<PriceRecord[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({ delivery_fee: '50' });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [isDelivery, setIsDelivery] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingOrderId, setDeletingOrderId] = useState<string | number | null>(null);
  const [customPhotoSize, setCustomPhotoSize] = useState('');
  const [pvcQuantity, setPvcQuantity] = useState(1);
  const [pvcFrontFile, setPvcFrontFile] = useState<FileData | null>(null);
  const [pvcBackFile, setPvcBackFile] = useState<FileData | null>(null);
  
  const [deliveryDetails, setDeliveryDetails] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [options, setOptions] = useState<OrderOptions>({
    paperSize: 'A4',
    paperType: '70gsm Standard',
    colorMode: 'Black & White'
  });

  const [photoOptions, setPhotoOptions] = useState({
    size: PHOTO_SIZES[0]
  });

  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const response = await fetch('/api/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const fetchPrices = async () => {
    setIsLoadingPrices(true);
    try {
      const response = await fetch('/api/prices');
      if (!response.ok) throw new Error('Failed to fetch prices');
      const data = await response.json();
      setPrices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPrices(false);
    }
  };

  const fetchSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const updatePrice = async (paper_size: string, color_mode: string, paper_type: string, price: number) => {
    try {
      const response = await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paper_size, color_mode, paper_type, price })
      });
      if (!response.ok) throw new Error('Failed to update price');
      await fetchPrices();
    } catch (err) {
      console.error(err);
      setError('Failed to update price');
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      if (!response.ok) throw new Error('Failed to update setting');
      await fetchSettings();
    } catch (err) {
      console.error(err);
      setError('Failed to update setting');
    }
  };

  React.useEffect(() => {
    fetchPrices();
    fetchSettings();
  }, []);

  React.useEffect(() => {
    if (location.pathname.startsWith('/admin') && adminTab === 'orders') {
      fetchOrders();
    }
  }, [location.pathname, adminTab]);

  const handlePaperSizeChange = (size: string) => {
    const availableTypes = PAPER_CONFIG[size as keyof typeof PAPER_CONFIG][options.colorMode as keyof (typeof PAPER_CONFIG)['A4']];
    setOptions({
      ...options,
      paperSize: size,
      paperType: availableTypes[0]
    });
  };

  const handleColorModeChange = (mode: string) => {
    const availableTypes = PAPER_CONFIG[options.paperSize as keyof typeof PAPER_CONFIG][mode as keyof (typeof PAPER_CONFIG)['A4']];
    setOptions({
      ...options,
      colorMode: mode,
      paperType: availableTypes.includes(options.paperType) ? options.paperType : availableTypes[0]
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setOrderSuccess(false);

    const formData = new FormData();
    acceptedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const data = await new Promise<any[]>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              console.error('JSON parse error:', e, 'Response:', xhr.responseText);
              reject(new Error(`Server returned an invalid response format. Received: ${xhr.responseText.substring(0, 50)}...`));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.details || errorData.error || `Upload failed with status ${xhr.status}`));
            } catch (e) {
              console.error('Error response parse error:', e, 'Response:', xhr.responseText);
              reject(new Error(`Upload failed with status ${xhr.status}. Received: ${xhr.responseText.substring(0, 50)}...`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error occurred during upload.'));
        });

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });

      setFiles(prev => [...prev, ...data]);
    } catch (err: any) {
      setError(err.message || 'Failed to upload files. Please try again.');
      console.error(err);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handlePvcUpload = async (file: File, side: 'front' | 'back') => {
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('files', file);
      
      const data = await new Promise<FileData[]>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error('Invalid response format'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });

      if (side === 'front') {
        setPvcFrontFile(data[0]);
      } else {
        setPvcBackFile(data[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.ms-powerpoint': ['.ppt']
    }
  } as any);

  const handleOrder = async () => {
    const hasFiles = activeService === 'pvc_card' ? (pvcFrontFile && pvcBackFile) : files.length > 0;
    if (!hasFiles) return;
    
    if (!deliveryDetails.name || !deliveryDetails.phone) {
      setError('Name and Phone Number are mandatory.');
      return;
    }

    if (isDelivery && !deliveryDetails.address) {
      setError('Please provide a delivery address.');
      return;
    }

    setIsUploading(true);
    try {
      const payload = activeService === 'documents' ? {
        files,
        ...options,
        isDelivery,
        deliveryDetails,
        totalPrice: estimatedCost,
        orderType: 'document'
      } : activeService === 'photos' ? {
        files,
        paperSize: photoOptions.size,
        paperType: photoOptions.size === 'Custom Size' ? `Photo Print (${customPhotoSize})` : 'Photo Print',
        colorMode: 'Full Color',
        isDelivery,
        deliveryDetails,
        totalPrice: estimatedCost,
        orderType: 'photo'
      } : {
        files: [pvcFrontFile, pvcBackFile],
        paperSize: 'Standard PVC',
        paperType: `PVC Card (${pvcQuantity} qty)`,
        colorMode: 'Full Color',
        isDelivery,
        deliveryDetails,
        totalPrice: estimatedCost,
        orderType: 'pvc_card'
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Order failed');
      const data = await response.json();
      setLastOrderId(data.orderId);
      setOrderSuccess(true);
      setFiles([]);
      setIsDelivery(false);
      setDeliveryDetails({ name: '', phone: '', address: '' });
    } catch (err) {
      setError('Failed to place order. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const updateOrderStatus = async (id: string | number, status: string) => {
    try {
      const response = await fetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Failed to update status');
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteOrder = async (id: string | number) => {
    console.log(`Deleting order: ${id}`);
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete order');
      }
      setDeletingOrderId(null);
      fetchOrders();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete order. Please try again.');
    }
  };

  const groupedOrders = React.useMemo(() => {
    const groups: Record<string, Order[]> = {};
    orders.forEach(order => {
      const groupId = order.order_group_id || `SINGLE-${order.id}`;
      if (!groups[groupId]) {
        groups[groupId] = [];
      }
      groups[groupId].push(order);
    });
    return Object.entries(groups).map(([groupId, items]) => {
      const first = items[0];
      return {
        order_group_id: groupId,
        status: first.status,
        created_at: first.created_at,
        customer_name: first.customer_name,
        customer_phone: first.customer_phone,
        customer_address: first.customer_address,
        is_delivery: first.is_delivery,
        total_price: first.total_price,
        order_type: first.order_type,
        files: items
      } as GroupedOrder;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders]);

  const filteredOrders = groupedOrders.filter(order => 
    (order.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.customer_phone || '').includes(searchTerm) ||
    (order.order_group_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.files.some(f => (f.original_name || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = files.reduce((sum, f) => sum + f.pageCount, 0);
  
  const currentPriceObj = activeService === 'documents' ? prices.find(p => 
    p.paper_size === options.paperSize && 
    p.color_mode === options.colorMode && 
    p.paper_type === options.paperType
  ) : activeService === 'photos' ? prices.find(p => 
    p.paper_size === photoOptions.size && 
    p.paper_type === 'Photo Print'
  ) : prices.find(p => 
    p.paper_size === 'Standard PVC' && 
    p.paper_type === 'PVC Card'
  );

  const pricePerPage = currentPriceObj ? currentPriceObj.price : 0;
  
  const deliveryFee = isDelivery ? parseFloat(settings.delivery_fee || '50') : 0;
  const estimatedCost = activeService === 'pvc_card'
    ? (pvcFrontFile && pvcBackFile ? (pricePerPage * pvcQuantity) + deliveryFee : 0)
    : (files.length > 0) ? (activeService === 'documents' ? (totalPages * pricePerPage) : (files.length * pricePerPage)) + deliveryFee : 0;

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
              <Printer size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Maha Laxmi Xerox</h1>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Professional Print Solutions</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {!location.pathname.startsWith('/admin') && (
              <div className="hidden lg:flex items-center gap-2 p-1 bg-gray-100 rounded-2xl">
                <button 
                  onClick={() => { setActiveService('documents'); setFiles([]); setOrderSuccess(false); }}
                  className={cn(
                    "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    activeService === 'documents' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Document Prints
                </button>
                <button 
                  onClick={() => { setActiveService('photos'); setFiles([]); setOrderSuccess(false); }}
                  className={cn(
                    "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    activeService === 'photos' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Photo Printing
                </button>
                <button 
                  onClick={() => { setActiveService('pvc_card'); setFiles([]); setOrderSuccess(false); setPvcFrontFile(null); setPvcBackFile(null); }}
                  className={cn(
                    "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    activeService === 'pvc_card' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  PVC Card
                </button>
              </div>
            )}
            <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
              {location.pathname.startsWith('/admin') && (
                <>
                  <button 
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 hover:text-emerald-600 transition-colors"
                  >
                    <User size={18} />
                    <span className="hidden md:inline">Customer Portal</span>
                  </button>
                  {isAdminAuthenticated && (
                    <button 
                      onClick={() => {
                        localStorage.removeItem('adminAuthenticated');
                        setIsAdminAuthenticated(false);
                        navigate('/admin');
                      }}
                      className="flex items-center gap-2 text-red-500 hover:text-red-600 transition-colors"
                    >
                      <LogOut size={18} />
                      <span className="hidden md:inline">Logout</span>
                    </button>
                  )}
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      <Routes>
        <Route path="/" element={
          <main className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Mobile Service Selector */}
            <div className="lg:hidden col-span-1 border-b border-gray-100 pb-6 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button 
                onClick={() => { setActiveService('documents'); setFiles([]); setOrderSuccess(false); }}
                className={cn(
                  "whitespace-nowrap px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border",
                  activeService === 'documents' ? "bg-emerald-600 border-emerald-600 text-white shadow-lg" : "bg-white text-gray-500 border-gray-100"
                )}
              >
                Document Prints
              </button>
              <button 
                onClick={() => { setActiveService('photos'); setFiles([]); setOrderSuccess(false); }}
                className={cn(
                  "whitespace-nowrap px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border",
                  activeService === 'photos' ? "bg-emerald-600 border-emerald-600 text-white shadow-lg" : "bg-white text-gray-500 border-gray-100"
                )}
              >
                Photo Printing
              </button>
              <button 
                onClick={() => { setActiveService('pvc_card'); setFiles([]); setOrderSuccess(false); setPvcFrontFile(null); setPvcBackFile(null); }}
                className={cn(
                  "whitespace-nowrap px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border",
                  activeService === 'pvc_card' ? "bg-emerald-600 border-emerald-600 text-white shadow-lg" : "bg-white text-gray-500 border-gray-100"
                )}
              >
                PVC Card
              </button>
            </div>

            {/* Left Column: Upload & Config */}
            <div className="lg:col-span-7 space-y-8">
              {/* Photo Specifications (Shown before upload for Photos) */}
              {activeService === 'photos' && (
                <section className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <PhotoIcon className="text-emerald-600" size={20} />
                    Photo Specifications
                  </h3>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-600">Select Photo Size</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {PHOTO_SIZES.map((size) => (
                          <button
                            key={size}
                            onClick={() => setPhotoOptions({ ...photoOptions, size })}
                            className={cn(
                              "px-4 py-4 rounded-2xl border text-left text-sm font-bold transition-all flex items-center justify-between group",
                              photoOptions.size === size 
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-lg" 
                                : "bg-gray-50 border-gray-100 text-gray-600 hover:border-emerald-300 hover:bg-white"
                            )}
                          >
                            {size}
                            <div className={cn(
                              "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                              photoOptions.size === size ? "bg-white border-white" : "border-gray-200"
                            )}>
                              {photoOptions.size === size && <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {photoOptions.size === 'Custom Size' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-3"
                      >
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400">Specify Custom Size (e.g., 10x12 inch)</label>
                        <input 
                          type="text"
                          placeholder="Enter size details..."
                          value={customPhotoSize}
                          onChange={(e) => setCustomPhotoSize(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold"
                        />
                      </motion.div>
                    )}
                  </div>
                </section>
              )}

              {activeService === 'pvc_card' && (
                <section className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <CreditCard className="text-emerald-600" size={20} />
                    PVC Card Specifications
                  </h3>
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-3">
                         <label className="text-xs font-black uppercase tracking-widest text-gray-400">Front Side</label>
                         <div 
                           className={cn(
                             "border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden h-40",
                             pvcFrontFile ? "border-emerald-500 bg-emerald-50/30 font-bold" : "border-gray-200 bg-gray-50 hover:border-emerald-400 hover:bg-white"
                           )}
                           onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) handlePvcUpload(file, 'front');
                              };
                              input.click();
                           }}
                         >
                           {pvcFrontFile ? (
                             <img 
                               src={`/api/view/${pvcFrontFile.filename}`} 
                               alt="Front" 
                               className="w-full h-full object-contain rounded-lg"
                               referrerPolicy="no-referrer"
                             />
                           ) : (
                             <>
                               <Plus className="text-gray-400" size={24} />
                               <span className="text-xs font-bold text-gray-500">Upload Front</span>
                             </>
                           )}
                         </div>
                       </div>

                       <div className="space-y-3">
                         <label className="text-xs font-black uppercase tracking-widest text-gray-400">Back Side</label>
                         <div 
                           className={cn(
                             "border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden h-40",
                             pvcBackFile ? "border-emerald-500 bg-emerald-50/30 font-bold" : "border-gray-200 bg-gray-50 hover:border-emerald-400 hover:bg-white"
                           )}
                           onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) handlePvcUpload(file, 'back');
                              };
                              input.click();
                           }}
                         >
                           {pvcBackFile ? (
                             <img 
                               src={`/api/view/${pvcBackFile.filename}`} 
                               alt="Back" 
                               className="w-full h-full object-contain rounded-lg"
                               referrerPolicy="no-referrer"
                             />
                           ) : (
                             <>
                               <Plus className="text-gray-400" size={24} />
                               <span className="text-xs font-bold text-gray-500">Upload Back</span>
                             </>
                           )}
                         </div>
                       </div>
                    </div>

                    {(pvcFrontFile || pvcBackFile) && (
                      <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400">PVC Card Preview</label>
                        <div className="flex flex-col md:flex-row gap-6 items-center justify-center p-8 bg-gray-100/50 rounded-[2.5rem] border border-gray-100">
                           <div className="w-full max-w-[280px] aspect-[1.58/1] bg-white rounded-[14px] shadow-2xl overflow-hidden border border-gray-100 relative group transition-transform hover:scale-105 duration-500">
                              {pvcFrontFile ? (
                                <img 
                                  src={`/api/view/${pvcFrontFile.filename}`} 
                                  alt="Front Preview" 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300 italic text-xs">No Front Image</div>
                              )}
                              <div className="absolute top-3 left-3 px-2 py-0.5 bg-emerald-600 text-[8px] text-white font-black uppercase tracking-widest rounded-full shadow-lg">Front Side</div>
                           </div>
                           <div className="w-full max-w-[280px] aspect-[1.58/1] bg-white rounded-[14px] shadow-2xl overflow-hidden border border-gray-100 relative group transition-transform hover:scale-105 duration-500">
                              {pvcBackFile ? (
                                <img 
                                  src={`/api/view/${pvcBackFile.filename}`} 
                                  alt="Back Preview" 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300 italic text-xs">No Back Image</div>
                              )}
                              <div className="absolute top-3 left-3 px-2 py-0.5 bg-emerald-600 text-[8px] text-white font-black uppercase tracking-widest rounded-full shadow-lg">Back Side</div>
                           </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400">Quantity of Cards</label>
                      <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 w-fit">
                         <button 
                           onClick={() => setPvcQuantity(q => Math.max(1, q - 1))}
                           className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-emerald-50 hover:border-emerald-200 transition-all font-black text-lg text-emerald-600 shadow-sm"
                         > - </button>
                         <span className="text-2xl font-black text-gray-800 w-8 text-center">{pvcQuantity}</span>
                         <button 
                           onClick={() => setPvcQuantity(q => q + 1)}
                           className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-emerald-50 hover:border-emerald-200 transition-all font-black text-lg text-emerald-600 shadow-sm"
                         > + </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {activeService !== 'pvc_card' && (
              <section>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  {activeService === 'documents' ? <FileUp className="text-emerald-600" size={24} /> : <PhotoIcon className="text-emerald-600" size={24} />}
                  {activeService === 'documents' ? 'Upload Documents' : 'Upload Photos'}
                </h2>
                
                {activeService !== 'pvc_card' && (
                <div 
                  {...getRootProps()} 
                  className={cn(
                    "border-2 border-dashed rounded-3xl p-12 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden",
                    isDragActive ? "border-emerald-500 bg-emerald-50/50" : "border-gray-200 bg-white hover:border-emerald-400 hover:bg-gray-50"
                  )}
                >
                  <input {...getInputProps()} />
                  
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-4 w-full">
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2">
                        <Loader2 className="animate-spin" size={32} />
                      </div>
                      <div className="w-full max-w-xs bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <motion.div 
                          className="bg-emerald-600 h-2.5 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-lg font-semibold">Uploading... {uploadProgress}%</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2">
                        {activeService === 'documents' ? <FileUp size={32} /> : <PhotoIcon size={32} />}
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{activeService === 'documents' ? 'Click or drag documents to upload' : 'Click or drag photos to upload'}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {activeService === 'documents' ? 'PDF, DOCX, PPTX, JPG, PNG' : 'JPG, PNG, JPEG'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                )}

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm"
                  >
                    <AlertCircle size={18} />
                    {error}
                  </motion.div>
                )}

                {orderSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex flex-col items-center text-center gap-2"
                  >
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2">
                      <CheckCircle2 size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-emerald-900">Order Placed Successfully!</h3>
                    <div className="bg-white px-6 py-4 rounded-2xl border border-emerald-100 my-2">
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Your Order ID</p>
                      <p className="text-2xl font-black text-emerald-600">#{lastOrderId}</p>
                    </div>
                    <p className="text-sm text-emerald-700">Please note down this Order ID. You will need it {isDelivery ? 'for delivery' : 'to collect your order at the counter'}.</p>
                  </motion.div>
                )}
              </section>
              )}

              {activeService !== 'pvc_card' && (
              <AnimatePresence>
                {files.length > 0 && (
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-8"
                  >
                    {/* File List */}
                    <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          <FileText className="text-emerald-600" size={20} />
                          Uploaded Files ({files.length})
                        </h3>
                        <button 
                          {...getRootProps()}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Plus size={14} />
                          Add More
                        </button>
                      </div>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {files.map((f, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                                {activeService === 'documents' ? <FileText size={16} /> : <PhotoIcon size={16} />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold truncate">{f.originalName}</p>
                                {activeService === 'documents' && <p className="text-[10px] text-gray-400 uppercase font-bold">{f.pageCount} {f.pageCount === 1 ? 'page' : 'pages'}</p>}
                              </div>
                            </div>
                            <button 
                              onClick={() => removeFile(idx)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
                      {activeService === 'documents' ? (
                        <>
                          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Settings2 className="text-emerald-600" size={20} />
                            Print Configuration
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-600">Paper Size</label>
                                <select 
                                  value={options.paperSize}
                                  onChange={(e) => handlePaperSizeChange(e.target.value)}
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                >
                                  <option value="A4">A4</option>
                                  <option value="A3">A3</option>
                                </select>
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-600">Paper Type</label>
                                <select 
                                  value={options.paperType}
                                  onChange={(e) => setOptions({...options, paperType: e.target.value})}
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                >
                                  {(PAPER_CONFIG[options.paperSize as keyof typeof PAPER_CONFIG] as any)[options.colorMode].map((type: string) => (
                                    <option key={type} value={type}>{type}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-semibold text-gray-600">Color Mode</label>
                                <div className="grid grid-cols-2 gap-4">
                                  {['Black & White', 'Full Color'].map((mode) => (
                                    <button
                                      key={mode}
                                      onClick={() => handleColorModeChange(mode)}
                                      className={cn(
                                        "px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                                        options.colorMode === mode 
                                          ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200" 
                                          : "bg-white border-gray-200 text-gray-600 hover:border-emerald-300"
                                      )}
                                    >
                                      {mode}
                                    </button>
                                  ))}
                                </div>
                              </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                          <CheckCircle className="text-emerald-600 shrink-0" size={20} />
                          <p className="text-sm text-emerald-800 font-medium">
                            Photo size <strong>{photoOptions.size === 'Custom Size' ? customPhotoSize : photoOptions.size}</strong> selected.
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
              )}

              <AnimatePresence>
                {(files.length > 0 || (activeService === 'pvc_card' && (pvcFrontFile || pvcBackFile))) && (
                  <motion.section 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm"
                  >
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <User className="text-emerald-600" size={20} />
                      Customer Information
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
                            <User size={12} /> Full Name <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="text"
                            placeholder="Enter your name"
                            value={deliveryDetails.name}
                            onChange={(e) => setDeliveryDetails({...deliveryDetails, name: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
                            <Phone size={12} /> Phone Number <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="tel"
                            placeholder="Enter 10-digit number"
                            value={deliveryDetails.phone}
                            onChange={(e) => setDeliveryDetails({...deliveryDetails, phone: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold flex items-center gap-2">
                          <Truck className="text-emerald-600" size={16} />
                          Home Delivery?
                        </h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={isDelivery}
                            onChange={(e) => setIsDelivery(e.target.checked)}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>

                      <AnimatePresence>
                        {isDelivery && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl mb-4 flex items-start gap-3">
                              <AlertCircle className="text-emerald-600 shrink-0 mt-0.5" size={16} />
                              <p className="text-xs text-emerald-800 leading-relaxed">
                                Home delivery is available only within a <strong>2KM radius</strong> from our shop. 
                                An additional delivery fee of <strong>₹{settings.delivery_fee || '50'}</strong> will be applied.
                              </p>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
                                <MapPin size={12} /> Delivery Address <span className="text-red-500">*</span>
                              </label>
                              <textarea 
                                placeholder="Enter your full address (within 2KM)"
                                rows={3}
                                value={deliveryDetails.address}
                                onChange={(setVal) => setDeliveryDetails({...deliveryDetails, address: (setVal.target as HTMLTextAreaElement).value})}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm resize-none"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {!isDelivery && (
                        <p className="text-xs text-gray-500 italic">
                          You've selected Store Pickup. Please visit our shop to collect your prints.
                        </p>
                      )}
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </div>

            {/* Right Column: Summary */}
            <div className="lg:col-span-5">
              <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm sticky top-32">
                <h2 className="text-xl font-bold mb-6">Order Summary</h2>
                
                <div className="space-y-6">
                  {(files.length > 0 || (activeService === 'pvc_card' && (pvcFrontFile || pvcBackFile))) ? (
                    <>
                      <div className="space-y-3">
                        {activeService === 'pvc_card' ? (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">PVC Front Image</span>
                              <span className={cn("font-bold", pvcFrontFile ? "text-emerald-600" : "text-red-500")}>
                                {pvcFrontFile ? 'Uploaded' : 'Required'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">PVC Back Image</span>
                              <span className={cn("font-bold", pvcBackFile ? "text-emerald-600" : "text-red-500")}>
                                {pvcBackFile ? 'Uploaded' : 'Required'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Card Quantity</span>
                              <span className="font-bold">{pvcQuantity} {pvcQuantity === 1 ? 'card' : 'cards'}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">{activeService === 'documents' ? 'Total Files' : 'Total Photos'}</span>
                              <span className="font-bold">{files.length}</span>
                            </div>
                            {activeService === 'documents' && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Total Pages</span>
                                <span className="font-bold">{totalPages}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div className="space-y-3 pt-4 border-t border-gray-100">
                        {activeService === 'pvc_card' ? (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Product</span>
                            <span className="font-medium">Standard PVC Card</span>
                          </div>
                        ) : (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">{activeService === 'documents' ? 'Paper Size' : 'Photo Size'}</span>
                            <span className="font-medium text-right">{activeService === 'documents' ? options.paperSize : (photoOptions.size === 'Custom Size' ? customPhotoSize : photoOptions.size)}</span>
                          </div>
                        )}
                        {activeService === 'documents' && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Paper Type</span>
                              <span className="font-medium">{options.paperType}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Color Mode</span>
                              <span className="font-medium">{options.colorMode}</span>
                            </div>
                          </>
                        )}
                        {isDelivery && (
                          <div className="flex justify-between text-sm text-emerald-600 font-medium">
                            <span className="flex items-center gap-1.5"><Truck size={14} /> Home Delivery</span>
                            <span>₹{(settings.delivery_fee || '50.00')}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-6 border-t border-gray-100">
                        <div className="flex justify-between items-end mb-8">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Estimated Cost</p>
                            <p className="text-3xl font-black text-emerald-600">₹{estimatedCost.toFixed(2)}</p>
                          </div>
                          <p className="text-[10px] text-gray-400 text-right leading-tight">Final price may vary<br/>based on ink coverage</p>
                        </div>

                        <button 
                          onClick={handleOrder}
                          disabled={isUploading || (activeService === 'pvc_card' && (!pvcFrontFile || !pvcBackFile)) || (activeService !== 'pvc_card' && files.length === 0)}
                          className="w-full bg-[#1A1A1A] text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                          {isUploading ? (
                            <Loader2 className="animate-spin" size={20} />
                          ) : (
                            <>
                              Place Order
                              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-center text-gray-400">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Layers size={24} />
                      </div>
                      <p className="text-sm font-medium">Provide card details to see<br/>pricing and options</p>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                      <AlertCircle size={14} />
                    </div>
                    <p>Orders are typically ready within 15-30 minutes during business hours.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        } />
        <Route path="/admin" element={
          isAdminAuthenticated ? (
            <main className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <h2 className="text-3xl font-black tracking-tight">Admin Dashboard</h2>
              <p className="text-gray-500 mt-1">Manage and process incoming print orders</p>
            </div>
            
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-2xl">
              <button 
                onClick={() => setAdminTab('orders')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
                  adminTab === 'orders' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                Orders
              </button>
              <button 
                onClick={() => setAdminTab('prices')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
                  adminTab === 'prices' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                Pricing
              </button>
            </div>

            {adminTab === 'orders' && (
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-6 py-3 bg-white border border-gray-200 rounded-2xl w-full md:w-80 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm"
                />
              </div>
            )}
          </div>

          {adminTab === 'orders' ? (
            isLoadingOrders ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                <Loader2 className="animate-spin mb-4" size={40} />
                <p className="font-medium">Loading orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-3xl p-24 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                  <FileText size={40} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">No orders found</h3>
                <p className="text-gray-500 mt-2">When customers place orders, they will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredOrders.map((order) => (
                  <motion.div 
                    key={order.order_group_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8">
                      {/* Order Info */}
                      <div className="lg:w-1/3 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border",
                            order.status === 'printed' 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                              : "bg-amber-50 text-amber-700 border-amber-100"
                          )}>
                            {order.status === 'printed' ? 'Completed' : (order.order_type === 'pvc_card' ? 'PVC Card Order' : order.order_type === 'photo' ? 'Photo Order' : 'Document Order')} #{order.order_group_id}
                          </span>
                          <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                            <Clock size={14} />
                            {new Date(order.created_at).toLocaleString()}
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Files ({order.files.length})</p>
                          {order.files.map((file) => (
                            <div key={file.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 border border-gray-100 shrink-0">
                                {order.order_type === 'pvc_card' ? <CreditCard size={20} /> : order.order_type === 'photo' ? <PhotoIcon size={20} /> : <FileText size={20} />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-sm truncate leading-tight">{file.original_name}</h4>
                                <p className="text-[10px] text-gray-500 mt-0.5 font-medium">
                                  {order.order_type === 'pvc_card' ? (
                                    <>PVC Card • {file.paper_type}</>
                                  ) : order.order_type === 'photo' ? (
                                    <>Photo Print • {file.paper_size}</>
                                  ) : (
                                    <>{file.page_count} Pages • {file.paper_size} • {file.color_mode} • {file.paper_type}</>
                                  )}
                                </p>
                                <div className="flex gap-2 mt-2">
                                  <a 
                                    href={`/api/view/${file.filename}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                  >
                                    <ExternalLink size={10} /> View
                                  </a>
                                  <a 
                                    href={`/api/view/${file.filename}?download=true`}
                                    className="text-[10px] font-bold text-gray-500 hover:text-gray-700 flex items-center gap-1"
                                  >
                                    <Download size={10} /> Download
                                  </a>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                          <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mb-1">Payment Details</p>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-emerald-700 font-medium">Total Amount</span>
                            <span className="text-lg font-black text-emerald-800">₹{order.total_price?.toFixed(2) || '0.00'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="lg:w-1/3 border-t lg:border-t-0 lg:border-l border-gray-100 lg:pl-8 pt-6 lg:pt-0">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4">Customer Details</p>
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                              <User size={20} />
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Name</p>
                              <p className="font-bold text-gray-900">{order.customer_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                              <Phone size={20} />
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Phone</p>
                              <p className="font-bold text-gray-900">{order.customer_phone}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 shrink-0">
                              <MapPin size={20} />
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Delivery Address</p>
                              <p className="font-bold text-gray-900 leading-relaxed">
                                {order.is_delivery ? order.customer_address : 'Store Pickup'}
                              </p>
                            </div>
                          </div>
                          {order.is_delivery && (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase rounded-lg border border-amber-100">
                              <Truck size={12} /> Home Delivery Requested
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="lg:w-1/3 border-t lg:border-t-0 lg:border-l border-gray-100 lg:pl-8 pt-6 lg:pt-0 flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4">Order Actions</p>
                          <div className="grid grid-cols-1 gap-3">
                            {order.status !== 'printed' ? (
                              <button 
                                onClick={() => updateOrderStatus(order.order_group_id, 'printed')}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                              >
                                <CheckCircle size={18} />
                                Mark as Completed
                              </button>
                            ) : (
                              <button 
                                onClick={() => updateOrderStatus(order.order_group_id, 'pending')}
                                className="w-full py-4 bg-white border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                              >
                                <RotateCcw size={18} />
                                Reopen Order
                              </button>
                            )}
                            
                            <button 
                              onClick={() => setDeletingOrderId(order.order_group_id)}
                              className="w-full py-4 bg-white border-2 border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                              <Trash2 size={18} />
                              Delete Order
                            </button>
                          </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full animate-pulse",
                              order.status === 'printed' ? "bg-emerald-500" : "bg-amber-500"
                            )} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                              {order.status === 'printed' ? 'Ready for Pickup' : 'Processing'}
                            </span>
                          </div>
                          <div className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-bold text-gray-500 uppercase">
                            {order.is_delivery ? 'Delivery' : 'Pickup'}
                          </div>
                        </div>

                        {deletingOrderId === order.order_group_id && (
                          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
                            >
                              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto mb-6">
                                <Trash2 size={32} />
                              </div>
                              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Order?</h3>
                              <p className="text-gray-500 mb-8">Are you sure you want to delete this order? This action cannot be undone.</p>
                              <div className="flex gap-3">
                                <button 
                                  onClick={() => setDeletingOrderId(null)}
                                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => deleteOrder(order.order_group_id)}
                                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
                                >
                                  Delete
                                </button>
                              </div>
                            </motion.div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-8">
              {/* Delivery Settings */}
              <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-xl font-black tracking-tight">General Settings</h3>
                </div>
                <div className="p-6">
                  <div className="max-w-xs space-y-2">
                    <label className="text-xs font-bold text-gray-600">Home Delivery Fee</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                      <input 
                        type="number"
                        value={settings.delivery_fee || 0}
                        onChange={(e) => updateSetting('delivery_fee', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* PVC Card Pricing */}
              <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-gray-100 bg-emerald-50/50 flex items-center justify-between">
                  <h3 className="text-xl font-black tracking-tight">PVC Card Printing</h3>
                  <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                    Price per Card
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      { label: 'Standard PVC Card', paper_size: 'Standard PVC', paper_type: 'PVC Card' }
                    ].map((opt) => {
                      const priceObj = prices.find(p => p.paper_size === opt.paper_size && p.paper_type === opt.paper_type);
                      return (
                        <div key={opt.label} className="space-y-2">
                          <label className="text-xs font-bold text-gray-600">{opt.label}</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                            <input 
                              type="number"
                              value={priceObj?.price || 0}
                              onChange={(e) => updatePrice(opt.paper_size, 'Full Color', opt.paper_type, parseFloat(e.target.value))}
                              className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all font-bold"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Photo Pricing */}
              <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-gray-100 bg-gray-100 flex items-center justify-between">
                  <h3 className="text-xl font-black tracking-tight">Photo Printing Pricing</h3>
                  <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                    Price per Photo
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {PHOTO_SIZES.map((size) => {
                      const priceObj = prices.find(p => p.paper_size === size && p.paper_type === 'Photo Print');
                      return (
                        <div key={size} className="space-y-2">
                          <label className="text-xs font-bold text-gray-600">{size}</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                            <input 
                              type="number"
                              value={priceObj?.price || 0}
                              onChange={(e) => updatePrice(size, 'Full Color', 'Photo Print', parseFloat(e.target.value))}
                              className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all font-bold"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {['A4', 'A3'].map((size) => (
                <div key={size} className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <h3 className="text-xl font-black tracking-tight">{size} Size Pricing</h3>
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                      Price per Page
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {['Black & White', 'Full Color'].map((mode) => (
                      <div key={mode} className="p-6">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">{mode} Options</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {PAPER_CONFIG[size as keyof typeof PAPER_CONFIG][mode as keyof (typeof PAPER_CONFIG)['A4']].map((type) => {
                            const priceObj = prices.find(p => p.paper_size === size && p.color_mode === mode && p.paper_type === type);
                            return (
                              <div key={type} className="space-y-2">
                                <label className="text-xs font-bold text-gray-600">{type}</label>
                                <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                  <input 
                                    type="number"
                                    value={priceObj?.price || 0}
                                    onChange={(e) => updatePrice(size, mode, type, parseFloat(e.target.value))}
                                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all font-bold"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
          ) : (
            <AdminLogin onLogin={() => setIsAdminAuthenticated(true)} />
          )
        } />
      </Routes>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-24 py-12">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Printer className="text-emerald-600" size={20} />
              <span className="font-bold">Maha Laxmi Xerox</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Your trusted partner for high-quality printing, scanning, and document services since 2010.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">Business Hours</h4>
            <ul className="text-sm text-gray-500 space-y-2">
              <li className="flex justify-between"><span>Mon - Sat</span> <span>9:00 AM - 9:00 PM</span></li>
              <li className="flex justify-between"><span>Sunday</span> <span>10:00 AM - 4:00 PM</span></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">Location</h4>
            <p className="text-sm text-gray-500 leading-relaxed">
              Shop No. 12, Laxmi Complex,<br />
              Main Road, Near City Center,<br />
              Mumbai, Maharashtra 400001
            </p>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 mt-12 pt-8 border-t border-gray-100 flex flex-col md:row justify-between items-center gap-4">
          <p className="text-xs text-gray-400">© 2024 Maha Laxmi Xerox. All rights reserved.</p>
          <div className="flex gap-6 text-xs text-gray-400">
            <a href="#" className="hover:text-emerald-600">Privacy Policy</a>
            <a href="#" className="hover:text-emerald-600">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
