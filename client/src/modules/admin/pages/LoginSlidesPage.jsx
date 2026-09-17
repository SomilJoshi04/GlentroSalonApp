import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import AdminPageLayout from '../components/layout/AdminPageLayout';
import AdminPageHeader from '../components/layout/AdminPageHeader';
import DataTable from '../components/DataTable';
import Modal from '../../../components/common/Modal';
import ImageUpload from '../../../components/common/ImageUpload';
import { getImageUrl } from '../../../utils/imageUtils';

// Inline API calls using the adminApi pattern
import api from '../../../services/api/axiosInstance';

const getLoginSlides = (params) => api.get('/login-slides', { params });
const createLoginSlide = (formData) =>
  api.post('/login-slides', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
const updateLoginSlide = (id, formData) =>
  api.put(`/login-slides/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
const deleteLoginSlide = (id) => api.delete(`/login-slides/${id}`);
const toggleLoginSlideStatus = (id) => api.patch(`/login-slides/${id}/status`);
const reorderLoginSlides = (data) => api.patch('/login-slides/reorder', data);

const SAFE_LINK_REGEX = /^(https?:\/\/|\/)/i;
const BLOCKED_PROTOCOLS = /^(javascript:|data:|vbscript:)/i;

const emptyForm = {
  title: '',
  description: '',
  buttonText: '',
  buttonLink: '',
  displayOrder: 0,
  isActive: true,
  startDate: '',
  endDate: '',
};

const LoginSlidesPage = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    loadSlides();
  }, []);

  const loadSlides = async () => {
    setLoading(true);
    try {
      const res = await getLoginSlides();
      const raw = res.data.data;
      // Support both array and paginated object
      setSlides(Array.isArray(raw) ? raw : raw.slides || []);
    } catch {
      toast.error('Failed to load login slides');
    } finally {
      setLoading(false);
    }
  };

  // ─── Form helpers ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingSlide(null);
    setForm(emptyForm);
    setSelectedFile(null);
    setShowForm(true);
  };

  const openEdit = (slide) => {
    setEditingSlide(slide);
    setForm({
      title: slide.title || '',
      description: slide.description || '',
      buttonText: slide.buttonText || '',
      buttonLink: slide.buttonLink || '',
      displayOrder: slide.displayOrder ?? 0,
      isActive: slide.isActive !== false,
      startDate: slide.startDate ? slide.startDate.slice(0, 10) : '',
      endDate: slide.endDate ? slide.endDate.slice(0, 10) : '',
    });
    setSelectedFile(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingSlide(null);
    setSelectedFile(null);
  };

  // ─── Client-side validation ───────────────────────────────────────────────

  const validateForm = () => {
    if (!editingSlide && !selectedFile) {
      toast.error('A slide image is required');
      return false;
    }
    if (form.buttonLink && BLOCKED_PROTOCOLS.test(form.buttonLink.trim())) {
      toast.error('Invalid link: dangerous protocol not allowed');
      return false;
    }
    if (form.buttonLink && !SAFE_LINK_REGEX.test(form.buttonLink.trim())) {
      toast.error('Button link must start with https:// or /');
      return false;
    }
    if (form.startDate && form.endDate && form.startDate >= form.endDate) {
      toast.error('Start date must be before end date');
      return false;
    }
    return true;
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('description', form.description);
    fd.append('buttonText', form.buttonText);
    fd.append('buttonLink', form.buttonLink);
    fd.append('displayOrder', form.displayOrder);
    fd.append('isActive', form.isActive);
    if (form.startDate) fd.append('startDate', form.startDate);
    if (form.endDate) fd.append('endDate', form.endDate);
    if (selectedFile) fd.append('image', selectedFile);

    try {
      if (editingSlide) {
        await updateLoginSlide(editingSlide._id, fd);
        toast.success('Slide updated');
      } else {
        await createLoginSlide(fd);
        toast.success('Slide created');
      }
      closeForm();
      loadSlides();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save slide';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Toggle status ────────────────────────────────────────────────────────

  const handleToggle = async (slide) => {
    setTogglingId(slide._id);
    try {
      await toggleLoginSlideStatus(slide._id);
      toast.success(`Slide ${slide.isActive ? 'deactivated' : 'activated'}`);
      loadSlides();
    } catch {
      toast.error('Failed to toggle status');
    } finally {
      setTogglingId(null);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget._id);
    try {
      await deleteLoginSlide(deleteTarget._id);
      toast.success('Slide deleted');
      setDeleteTarget(null);
      loadSlides();
    } catch {
      toast.error('Failed to delete slide');
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Reorder ──────────────────────────────────────────────────────────────

  const handleMoveUp = async (slide, index) => {
    if (index === 0) return;
    const prev = slides[index - 1];
    try {
      await reorderLoginSlides({
        orders: [
          { id: slide._id, displayOrder: prev.displayOrder },
          { id: prev._id, displayOrder: slide.displayOrder },
        ],
      });
      loadSlides();
    } catch {
      toast.error('Failed to reorder');
    }
  };

  const handleMoveDown = async (slide, index) => {
    if (index === slides.length - 1) return;
    const next = slides[index + 1];
    try {
      await reorderLoginSlides({
        orders: [
          { id: slide._id, displayOrder: next.displayOrder },
          { id: next._id, displayOrder: slide.displayOrder },
        ],
      });
      loadSlides();
    } catch {
      toast.error('Failed to reorder');
    }
  };

  // ─── Table columns ────────────────────────────────────────────────────────

  const columns = [
    {
      header: 'Order',
      render: (slide, idx) => (
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-muted-text w-5">{idx + 1}</span>
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => handleMoveUp(slide, idx)}
              disabled={idx === 0}
              className="p-0.5 rounded hover:bg-surface-variant disabled:opacity-30 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-muted-text">arrow_upward</span>
            </button>
            <button
              onClick={() => handleMoveDown(slide, idx)}
              disabled={idx === slides.length - 1}
              className="p-0.5 rounded hover:bg-surface-variant disabled:opacity-30 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-muted-text">arrow_downward</span>
            </button>
          </div>
        </div>
      ),
    },
    {
      header: 'Preview',
      render: (slide) =>
        slide.image ? (
          <img
            src={getImageUrl(slide.image)}
            alt={slide.title || 'Slide'}
            className="w-20 h-12 object-cover rounded-lg border border-border"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-20 h-12 bg-surface-variant rounded-lg flex items-center justify-center border border-border">
            <span className="material-symbols-outlined text-muted-text text-[20px]">image</span>
          </div>
        ),
    },
    {
      header: 'Title / Description',
      render: (slide) => (
        <div>
          <p className="font-medium text-on-surface text-[14px]">{slide.title || '(No title)'}</p>
          {slide.description && (
            <p className="text-muted-text text-[12px] mt-0.5 line-clamp-1">{slide.description}</p>
          )}
          {(slide.buttonText || slide.buttonLink) && (
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              <span className="material-symbols-outlined text-[12px]">open_in_new</span>
              {slide.buttonText || 'CTA'}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Schedule',
      render: (slide) => {
        const fmt = (d) => d ? new Date(d).toLocaleDateString() : null;
        if (!slide.startDate && !slide.endDate) {
          return <span className="text-[12px] text-muted-text">Always</span>;
        }
        return (
          <div className="text-[12px] text-muted-text">
            {slide.startDate && <div>From: {fmt(slide.startDate)}</div>}
            {slide.endDate && <div>Until: {fmt(slide.endDate)}</div>}
          </div>
        );
      },
    },
    {
      header: 'Status',
      render: (slide) => (
        <button
          onClick={() => handleToggle(slide)}
          disabled={togglingId === slide._id}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium transition-all border ${
            slide.isActive
              ? 'bg-success/10 text-success border-success/20 hover:bg-success/20'
              : 'bg-surface-variant text-muted-text border-border hover:bg-border'
          } disabled:opacity-60`}
        >
          <span
            className="material-symbols-outlined text-[14px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {slide.isActive ? 'check_circle' : 'cancel'}
          </span>
          {togglingId === slide._id ? '...' : slide.isActive ? 'Active' : 'Inactive'}
        </button>
      ),
    },
    {
      header: 'Actions',
      render: (slide) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEdit(slide)}
            className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
            title="Edit"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button
            onClick={() => setDeleteTarget(slide)}
            className="p-2 rounded-lg hover:bg-error/10 text-error transition-colors"
            title="Delete"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      ),
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Login Slides"
        description="Manage promotional slides shown on the user login page"
        actions={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-[14px] font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
            Add Slide
          </button>
        }
      />

      {/* Preview Info Banner */}
      <div className="mb-4 flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
        <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">info</span>
        <p className="text-[13px] text-on-surface">
          Slides appear on the User Login page in the order shown below. Only <strong>Active</strong> slides
          within their scheduled date range are shown publicly. An image is required for each slide.
        </p>
      </div>

      <DataTable columns={columns} data={slides} loading={loading} />

      {/* ─── Create / Edit Form Modal ─────────────────────────────── */}
      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editingSlide ? 'Edit Login Slide' : 'Add Login Slide'}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Image Upload */}
          <div>
            <ImageUpload
              label={`Slide Image ${editingSlide ? '(leave blank to keep current)' : '*'}`}
              currentImage={editingSlide?.image || ''}
              onFileSelect={(file) => setSelectedFile(file)}
              maxSizeMB={5}
              maxWidthOrHeight={1920}
            />
            {!editingSlide && !selectedFile && (
              <p className="text-[12px] text-error mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">error</span>
                Image is required for new slides
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-[13px] font-medium text-on-surface mb-1">Title (optional)</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Welcome to Glentro"
              className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-on-surface text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[13px] font-medium text-on-surface mb-1">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Slide subtitle or tagline"
              rows={2}
              className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-on-surface text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* CTA */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-on-surface mb-1">Button Text (optional)</label>
              <input
                type="text"
                value={form.buttonText}
                onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
                placeholder="e.g. Book Now"
                className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-on-surface text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-on-surface mb-1">Button Link (optional)</label>
              <input
                type="text"
                value={form.buttonLink}
                onChange={(e) => setForm({ ...form, buttonLink: e.target.value })}
                placeholder="https://... or /path"
                className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-on-surface text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-on-surface mb-1">Start Date (optional)</label>
              <input
                type="date"
                value={form.startDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-on-surface text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-on-surface mb-1">End Date (optional)</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                min={form.startDate || new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-on-surface text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Display Order + Active */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-on-surface mb-1">Display Order</label>
              <input
                type="number"
                min="0"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: e.target.value === '' ? '' : parseInt(e.target.value) })}
                className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-on-surface text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${form.isActive ? 'bg-primary' : 'bg-border'}`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${form.isActive ? 'translate-x-6' : 'translate-x-0'}`}
                  />
                </div>
                <span className="text-[13px] font-medium text-on-surface">
                  {form.isActive ? 'Active' : 'Inactive'}
                </span>
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeForm}
              className="flex-1 px-4 py-2.5 border border-border text-on-surface rounded-xl text-[14px] font-medium hover:bg-surface-variant transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-[14px] font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  Saving...
                </>
              ) : editingSlide ? 'Save Changes' : 'Create Slide'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Delete Confirmation Modal ────────────────────────────── */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Slide"
      >
        <div className="space-y-4">
          <p className="text-[14px] text-muted-text">
            Are you sure you want to delete{' '}
            <strong className="text-on-surface">"{deleteTarget?.title || 'this slide'}"</strong>?
            This action cannot be undone and will remove the slide image.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="flex-1 px-4 py-2.5 border border-border text-on-surface rounded-xl text-[14px] font-medium hover:bg-surface-variant transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!!deletingId}
              className="flex-1 px-4 py-2.5 bg-error text-white rounded-xl text-[14px] font-medium hover:bg-error/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {deletingId ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  Deleting...
                </>
              ) : 'Delete Slide'}
            </button>
          </div>
        </div>
      </Modal>
    </AdminPageLayout>
  );
};

export default LoginSlidesPage;
