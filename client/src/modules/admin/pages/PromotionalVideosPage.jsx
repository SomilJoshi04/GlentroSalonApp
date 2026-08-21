import { useState, useEffect, useRef } from 'react';
import { getBanners, createBanner, updateBanner, deleteBanner, toggleBannerStatus } from '../services/adminApi';
import ImageUpload from '../../../components/common/ImageUpload';
import { getImageUrl } from '../../../utils/imageUtils';
import Modal from '../../../components/common/Modal';
import { compressVideo } from '../../../utils/videoCompression';
import toast from 'react-hot-toast';
import AdminPageLayout from '../components/layout/AdminPageLayout';
import AdminPageHeader from '../components/layout/AdminPageHeader';
import DataTable from '../components/DataTable';

const PromotionalVideosPage = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);

  // Compression state
  const [compressionStatus, setCompressionStatus] = useState('idle'); // idle, preparing, compressing, success, error
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [videoStats, setVideoStats] = useState(null); // { originalSize, compressedSize, ratio }
  
  const [form, setForm] = useState({ 
    title: '', 
    link: '', 
    type: 'video', // Force type to 'video' for new promotional videos
    description: '', 
    ctaText: 'Book Now', 
    displayOrder: 0,
    startDate: '',
    endDate: ''
  });
  
  const [selectedFile, setSelectedFile] = useState(null); // For video poster (optional)
  const [selectedVideoFile, setSelectedVideoFile] = useState(null); // For compressed video file
  
  const videoInputRef = useRef(null);

  useEffect(() => { loadVideos(); }, []);

  const loadVideos = async () => {
    try {
      const res = await getBanners(); // Reuse getBanners API endpoint which returns all media
      setVideos(res.data.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load promotional videos');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a valid video file');
      return;
    }

    const originalSizeMB = file.size / (1024 * 1024);
    if (originalSizeMB > 60) {
      toast.error('Video file is too large (maximum source size 60MB)');
      if (videoInputRef.current) videoInputRef.current.value = '';
      return;
    }

    setCompressionStatus('preparing');
    setCompressionProgress(0);
    setVideoStats(null);

    try {
      setCompressionStatus('compressing');
      const compressedFile = await compressVideo(file, (progress) => {
        setCompressionProgress(progress);
      });

      const compressedSizeMB = compressedFile.size / (1024 * 1024);
      const ratio = Math.round(((file.size - compressedFile.size) / file.size) * 100);

      setSelectedVideoFile(compressedFile);
      setVideoStats({
        originalSize: originalSizeMB.toFixed(2),
        compressedSize: compressedSizeMB.toFixed(2),
        ratio
      });
      setCompressionStatus('success');
      toast.success('Video compressed successfully!');
    } catch (err) {
      console.error('Compression failed:', err);
      setCompressionStatus('error');
      setSelectedVideoFile(null);
      toast.error(err.message || 'Failed to compress video');
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const openAddForm = () => {
    setEditingVideo(null);
    setForm({ 
      title: '', 
      link: '', 
      type: 'video',
      description: '', 
      ctaText: 'Book Now', 
      displayOrder: videos.length,
      startDate: '',
      endDate: ''
    });
    setSelectedFile(null);
    setSelectedVideoFile(null);
    setCompressionStatus('idle');
    setVideoStats(null);
    setShowForm(true);
  };

  const openEditForm = (video) => {
    setEditingVideo(video);
    setForm({
      title: video.title || '',
      link: video.link || '',
      type: video.type || 'video',
      description: video.description || '',
      ctaText: video.ctaText || 'Book Now',
      displayOrder: video.displayOrder || 0,
      startDate: video.startDate ? new Date(video.startDate).toISOString().split('T')[0] : '',
      endDate: video.endDate ? new Date(video.endDate).toISOString().split('T')[0] : ''
    });
    setSelectedFile(null);
    setSelectedVideoFile(null);
    setCompressionStatus('idle');
    setVideoStats(null);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedVideoFile && !editingVideo?.video) {
      toast.error('Please upload a video file');
      return;
    }
    if (compressionStatus === 'compressing') {
      toast.error('Please wait for video compression to complete');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('link', form.link);
      formData.append('type', 'video'); // Force video type
      formData.append('description', form.description);
      formData.append('ctaText', form.ctaText);
      formData.append('displayOrder', form.displayOrder);
      if (form.startDate) formData.append('startDate', form.startDate);
      if (form.endDate) formData.append('endDate', form.endDate);

      if (selectedFile) {
        formData.append('image', selectedFile); // Poster image
      }
      if (selectedVideoFile) {
        formData.append('video', selectedVideoFile);
      }

      if (editingVideo) {
        await updateBanner(editingVideo._id, formData);
        toast.success('Promotional video updated successfully');
      } else {
        await createBanner(formData);
        toast.success('Promotional video published successfully');
      }
      
      setShowForm(false);
      loadVideos();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to save promotional video');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this promotional video?')) {
      try {
        await deleteBanner(id);
        toast.success('Promotional video deleted');
        loadVideos();
      } catch (error) {
        toast.error('Failed to delete promotional video');
      }
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleBannerStatus(id);
      loadVideos();
    } catch (error) {
      toast.error('Failed to toggle status');
    }
  };

  const columns = [
    {
      header: 'Video',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.image ? (
            <img src={getImageUrl(row.image)} alt={row.title} className="w-16 h-10 rounded object-cover bg-background" />
          ) : (
            <div className="w-16 h-10 rounded bg-surface-variant flex items-center justify-center text-muted-text">
              <span className="material-symbols-outlined text-[20px]">videocam</span>
            </div>
          )}
          <div>
            <div className="text-on-surface font-medium">{row.title}</div>
            <div className="text-[12px] text-muted-text line-clamp-1">{row.description || 'No description'}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Type',
      render: (row) => (
        <span className="text-[12px] font-medium text-text-secondary bg-surface-variant px-2 py-0.5 rounded-full capitalize">
          {row.type || 'Video'}
        </span>
      )
    },
    {
      header: 'Status',
      render: (row) => (
        <button 
          onClick={() => handleToggle(row._id)}
          className={`px-2 py-0.5 rounded-full text-[12px] font-bold transition-colors ${row.isActive ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-text-muted/10 text-text-muted hover:bg-text-muted/20'}`}
        >
          {row.isActive ? 'Active' : 'Hidden'}
        </button>
      )
    },
    {
      header: 'Action',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button onClick={() => openEditForm(row)} className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-colors">
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button onClick={() => handleDelete(row._id)} className="text-error hover:bg-error/10 p-1.5 rounded-lg transition-colors">
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <AdminPageLayout>
      <AdminPageHeader 
        title="Promotional Videos"
        description="Configure user app home page background autoplay video loops."
        actions={
          <button 
            onClick={openAddForm} 
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition-all shadow-sm active:scale-95 duration-100 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add Video
          </button>
        }
      />

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingVideo ? "Edit Promotional Video" : "Add Promotional Video"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          


          {/* Video upload section */}
          <div className="space-y-2 border border-border border-dashed p-4 rounded-2xl bg-surface-elevated">
            <label className="block text-xs font-bold text-text-secondary">Upload Video *</label>
            <div className="flex items-center gap-3">
              <input 
                type="file" 
                ref={videoInputRef}
                onChange={handleVideoSelect} 
                accept="video/*" 
                className="hidden" 
              />
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={compressionStatus === 'compressing'}
                className="px-4 py-2.5 bg-surface text-on-surface hover:bg-surface-variant border border-border text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">videocam</span>
                Select Video File
              </button>
              {editingVideo?.video && !selectedVideoFile && (
                <span className="text-[10px] text-success bg-success/15 px-2.5 py-1 rounded-full border border-success/30 font-bold">
                  Existing Video Stored
                </span>
              )}
            </div>

            {/* Video Compression Progress & Stage rendering */}
            {compressionStatus !== 'idle' && (
              <div className="mt-3 space-y-2 p-3.5 bg-background rounded-xl border border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-secondary">
                    {compressionStatus === 'preparing' && 'Preparing Video Chunks...'}
                    {compressionStatus === 'compressing' && `Compressing Video (${compressionProgress}%)`}
                    {compressionStatus === 'success' && 'Video Compressed & Optimized!'}
                    {compressionStatus === 'error' && 'Compression Failed'}
                  </span>
                  {compressionStatus === 'compressing' && (
                    <span className="font-bold text-primary-500">{compressionProgress}%</span>
                  )}
                </div>

                {compressionStatus === 'compressing' && (
                  <div className="w-full bg-surface-variant rounded-full h-1.5 overflow-hidden">
                    <div className="bg-primary-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${compressionProgress}%` }}></div>
                  </div>
                )}

                {videoStats && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-[10px] text-text-muted">
                    <div>
                      <span className="block font-medium">Original Size</span>
                      <span className="font-bold text-text-secondary">{videoStats.originalSize} MB</span>
                    </div>
                    <div>
                      <span className="block font-medium">Optimized Size</span>
                      <span className="font-bold text-primary-500">{videoStats.compressedSize} MB</span>
                    </div>
                    <div>
                      <span className="block font-medium">Reduction Ratio</span>
                      <span className="font-bold text-success">{videoStats.ratio}% saved</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Optional Poster Image section */}
          <div>
            <ImageUpload 
              onImageSelect={setSelectedFile}
              currentImage={editingVideo?.image}
              aspectRatio="video"
            />
          </div>
        {/* Details Section */}
        <div className="p-4 bg-surface-elevated rounded-xl border border-border space-y-4 mt-4">
          <h4 className="text-sm font-bold text-text-primary mb-1">2. Video Details</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-text-secondary">Title <span className="text-error">*</span></label>
              <input 
                value={form.title} 
                onChange={e => setForm({...form, title: e.target.value})} 
                required 
                placeholder="e.g., Summer Special Campaign"
                className="w-full mt-1.5 px-3 py-2 rounded-xl bg-surface border border-border text-text-primary text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all shadow-inner" 
              />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-text-secondary">Destination Link (Optional)</label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-text-muted">link</span>
                <input 
                  value={form.link} 
                  onChange={e => setForm({...form, link: e.target.value})} 
                  placeholder="https://..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-border text-text-primary text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all shadow-inner" 
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary">Description / Caption</label>
            <textarea 
              value={form.description} 
              onChange={e => setForm({...form, description: e.target.value})} 
              placeholder="Brief description shown below the video..."
              rows="2"
              className="w-full mt-1.5 px-3 py-2 rounded-xl bg-surface border border-border text-text-primary text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all shadow-inner resize-none" 
            />
          </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-text-secondary">Call to Action Text</label>
                <input 
                  value={form.ctaText} 
                  onChange={e => setForm({...form, ctaText: e.target.value})} 
                  placeholder="e.g., Book Now, Learn More"
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-surface border border-border text-text-primary text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all shadow-inner" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary">Display Priority (Order)</label>
                <input 
                  type="number"
                  value={form.displayOrder} 
                  onChange={e => setForm({...form, displayOrder: parseInt(e.target.value) || 0})} 
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-surface border border-border text-text-primary text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all shadow-inner" 
                />
                <p className="text-[10px] text-text-muted mt-1">Higher numbers appear first.</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-surface-elevated rounded-xl border border-border space-y-4">
            <h4 className="text-sm font-bold text-text-primary mb-1">3. Scheduling (Optional)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-text-secondary">Start Date</label>
                <input 
                  type="date"
                  value={form.startDate ? form.startDate.split('T')[0] : ''} 
                  onChange={e => setForm({...form, startDate: e.target.value})} 
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-surface border border-border text-text-primary text-sm focus:ring-1 focus:ring-primary outline-none transition-all" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary">End Date</label>
                <input 
                  type="date"
                  value={form.endDate ? form.endDate.split('T')[0] : ''} 
                  onChange={e => setForm({...form, endDate: e.target.value})} 
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-surface border border-border text-text-primary text-sm focus:ring-1 focus:ring-primary outline-none transition-all" 
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 text-text-muted hover:bg-surface-variant rounded-xl text-sm font-bold transition-colors">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving || compressionStatus === 'compressing'} 
              className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-sm hover:bg-primary-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Saving...</>
              ) : (
                editingVideo ? 'Update Video' : 'Publish Video'
              )}
            </button>
          </div>
        </form>
      </Modal>

      <DataTable 
        columns={columns}
        data={videos}
        loading={loading}
      />
    </AdminPageLayout>
  );
};

export default PromotionalVideosPage;
