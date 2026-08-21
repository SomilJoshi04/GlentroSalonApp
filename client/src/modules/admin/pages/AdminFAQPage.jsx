import { useState, useEffect } from 'react';
import AdminPageLayout from '../components/layout/AdminPageLayout';
import AdminPageHeader from '../components/layout/AdminPageHeader';
import { getAdminFAQs, createFAQ, updateFAQ, deleteFAQ } from '../services/adminApi';

const AdminFAQPage = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingFaq, setEditingFaq] = useState(null);
  const [formData, setFormData] = useState({ question: '', answer: '', order: 0, isActive: true });
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadFaqs();
  }, []);

  const loadFaqs = async () => {
    setLoading(true);
    try {
      const res = await getAdminFAQs();
      setFaqs(res.data.data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleOpenModal = (faq = null) => {
    if (faq) {
      setEditingFaq(faq);
      setFormData({ question: faq.question, answer: faq.answer, order: faq.order, isActive: faq.isActive });
    } else {
      setEditingFaq(null);
      setFormData({ question: '', answer: '', order: 0, isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingFaq) {
        await updateFAQ(editingFaq._id, formData);
      } else {
        await createFAQ(formData);
      }
      setIsModalOpen(false);
      loadFaqs();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this FAQ?')) {
      try {
        await deleteFAQ(id);
        loadFaqs();
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader 
        title="FAQ Management"
        description="Manage frequently asked questions for the User Support page."
        actions={
          <button onClick={() => handleOpenModal()} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium">
            + Add FAQ
          </button>
        }
      />

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-surface-variant rounded-xl w-full"></div>)}
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border shadow-sm divide-y divide-border">
          {faqs.length === 0 ? (
            <div className="p-8 text-center text-muted-text">No FAQs found.</div>
          ) : (
            faqs.map(faq => (
              <div key={faq._id} className="p-5 flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-on-surface">{faq.question}</h4>
                  <p className="text-sm text-muted-text mt-1">{faq.answer}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${faq.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                      {faq.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-[12px] text-muted-text">Order: {faq.order}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleOpenModal(faq)} className="p-2 text-primary hover:bg-primary/10 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button onClick={() => handleDelete(faq._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface w-full max-w-lg rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold mb-4">{editingFaq ? 'Edit FAQ' : 'Add FAQ'}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-on-surface">Question</label>
                <input 
                  type="text" 
                  value={formData.question}
                  onChange={e => setFormData({ ...formData, question: e.target.value })}
                  className="w-full mt-1 p-2 border border-border rounded-lg text-sm bg-background-alt"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-on-surface">Answer</label>
                <textarea 
                  value={formData.answer}
                  onChange={e => setFormData({ ...formData, answer: e.target.value })}
                  rows="4"
                  className="w-full mt-1 p-2 border border-border rounded-lg text-sm bg-background-alt resize-none"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-on-surface">Order</label>
                  <input 
                    type="number" 
                    value={formData.order}
                    onChange={e => setFormData({ ...formData, order: e.target.value })}
                    className="w-full mt-1 p-2 border border-border rounded-lg text-sm bg-background-alt"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.isActive}
                      onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded text-primary"
                    />
                    <span className="text-sm font-medium">Active</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-text hover:bg-surface-variant rounded-xl text-sm font-medium">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium">Save FAQ</button>
            </div>
          </div>
        </div>
      )}
    </AdminPageLayout>
  );
};

export default AdminFAQPage;
