import { useState, useEffect } from 'react';
import { getAdminContent, updateAdminContent } from '../services/adminApi';
import AdminPageHeader from '../components/layout/AdminPageHeader';
import Button from '../../../components/common/Button';
import toast from 'react-hot-toast';

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState('privacy_policy');
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    isPublished: false
  });

  const tabs = [
    { 
      id: 'privacy_policy', 
      label: 'Privacy Policy',
      titlePlaceholder: 'e.g. Privacy Policy',
      contentPlaceholder: 'Enter your privacy policy content...'
    },
    { 
      id: 'terms_conditions', 
      label: 'Terms & Conditions',
      titlePlaceholder: 'e.g. Terms & Conditions',
      contentPlaceholder: 'Enter your terms and conditions content...'
    }
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);

  useEffect(() => {
    fetchContent();
  }, [activeTab]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const res = await getAdminContent(activeTab);
      if (res.data?.success) {
        setContent(res.data.data);
        setFormData({
          title: res.data.data.title || '',
          body: res.data.data.body || '',
          isPublished: res.data.data.isPublished || false
        });
      }
    } catch (error) {
      console.error('Failed to fetch content:', error);
      toast.error('Failed to load content.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.body.trim()) {
      toast.error('Title and content are required.');
      return;
    }

    setSaving(true);
    
    try {
      const res = await updateAdminContent(activeTab, formData);
      if (res.data?.success) {
        toast.success('Content updated successfully.');
      }
    } catch (error) {
      console.error('Failed to update content:', error);
      toast.error('Failed to update content.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <AdminPageHeader 
        title="Content Management" 
        subtitle="Manage legal documents and help sections"
      />

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-border hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap py-4 px-6 font-medium text-[14px] border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-text hover:text-on-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-surface-variant rounded-xl w-full"></div>
          <div className="h-64 bg-surface-variant rounded-xl w-full"></div>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-headline-sm text-lg font-bold">
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <span className="text-[14px] font-medium text-on-surface">Published</span>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-surface-variant rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </div>
              </label>
              
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="px-6 rounded-full font-medium"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-muted-text mb-1">Page Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={activeTabData?.titlePlaceholder}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors text-[14px]"
              />
            </div>
            
            <div>
              <label className="block text-[13px] font-medium text-muted-text mb-1">Page Content</label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder={activeTabData?.contentPlaceholder}
                rows={15}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors text-[14px] font-mono resize-y"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
