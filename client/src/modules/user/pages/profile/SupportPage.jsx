import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageHeader from '../../../../components/common/PageHeader';
import { getActiveFAQs } from '../../services/userApi';
import { useSettings } from '../../../../context/SettingContext';
import { getImageUrl } from '../../../../utils/imageUtils';

const SupportPage = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const fromProfile = location.state?.fromProfile;
  const { settings } = useSettings();

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const res = await getActiveFAQs();
        if (res.data?.success) {
          setFaqs(res.data.data);
        }
      } catch (error) {
        console.error('Failed to load FAQs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  const toggleFaq = (id) => {
    setOpenFaq(openFaq === id ? null : id);
  };



  return (
    <div className="w-full min-h-screen bg-surface-bright pb-16">
      <div className="md:hidden">
        <PageHeader title="Help & Support" fallbackPath="/profile" />
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-surface-container-lowest border-b border-border mb-8 py-8 md:py-16">
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
        <div className="w-full max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 relative z-10">

          <div className="flex items-center gap-4 mb-4">
            {fromProfile && (
              <button
                onClick={() => navigate(-1)}
                className="p-2 -ml-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors flex items-center justify-center"
                aria-label="Go back"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 mb-4">
            {settings?.appLogo && (
              <img src={getImageUrl(settings.appLogo)} alt="App Logo" className="w-12 h-12 object-contain rounded-xl bg-white shadow-sm" />
            )}
            <h1 className="font-headline-lg md:font-headline-xl text-3xl md:text-4xl lg:text-[40px] font-bold text-on-surface tracking-tight">
              Help & Support
            </h1>
          </div>

          <p className="text-muted-text max-w-2xl text-lg mt-2">
            {settings?.supportDescription || 'Our support team is here to help you with any questions, concerns, or difficulties you may experience.'}
          </p>
        </div>
      </div>

      <div className="w-full max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 space-y-12">

        {/* Contact Information */}
        <section>
          <h2 className="text-xl font-semibold text-on-surface mb-6">Contact Us</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {settings?.supportEmail && (
              <a href={`mailto:${settings.supportEmail}`} className="flex flex-col items-center p-6 bg-surface border border-border rounded-2xl hover:border-primary/30 hover:shadow-md transition-all group">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[24px]">mail</span>
                </div>
                <h3 className="font-semibold text-on-surface">Email Support</h3>
                <p className="text-sm text-primary font-medium mt-1">{settings.supportEmail}</p>
              </a>
            )}

            {settings?.supportPhone && (
              <a href={`tel:${settings.supportPhone}`} className="flex flex-col items-center p-6 bg-surface border border-border rounded-2xl hover:border-primary/30 hover:shadow-md transition-all group">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[24px]">call</span>
                </div>
                <h3 className="font-semibold text-on-surface">Phone Support</h3>
                <p className="text-sm text-primary font-medium mt-1">{settings.supportPhone}</p>
              </a>
            )}

            {settings?.supportWhatsApp && (
              <a href={`https://wa.me/${settings.supportWhatsApp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="flex flex-col items-center p-6 bg-surface border border-border rounded-2xl hover:border-primary/30 hover:shadow-md transition-all group">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[24px]">chat</span>
                </div>
                <h3 className="font-semibold text-on-surface">WhatsApp</h3>
                <p className="text-sm text-green-600 font-medium mt-1">{settings.supportWhatsApp}</p>
              </a>
            )}
          </div>
          {settings?.supportHours && (
            <p className="text-center text-sm text-muted-text mt-4 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              Support Hours: {settings.supportHours}
            </p>
          )}
        </section>

        {/* FAQs */}
        <section>
          <h2 className="text-xl font-semibold text-on-surface mb-6">Frequently Asked Questions</h2>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-surface-variant rounded-2xl animate-pulse"></div>
              ))}
            </div>
          ) : faqs.length > 0 ? (
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div
                  key={faq._id}
                  className={`border border-border rounded-2xl overflow-hidden transition-all duration-300 ${openFaq === faq._id ? 'bg-surface shadow-md border-primary/20' : 'bg-surface/50 hover:bg-surface'}`}
                >
                  <button
                    onClick={() => toggleFaq(faq._id)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                  >
                    <span className={`font-medium pr-4 ${openFaq === faq._id ? 'text-primary' : 'text-on-surface'}`}>{faq.question}</span>
                    <span className={`material-symbols-outlined transition-transform duration-300 text-muted-text ${openFaq === faq._id ? 'rotate-180 text-primary' : ''}`}>
                      expand_more
                    </span>
                  </button>
                  <div
                    className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openFaq === faq._id ? 'max-h-96 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}
                  >
                    <p className="text-on-surface-variant leading-relaxed whitespace-pre-wrap">{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 bg-surface rounded-2xl border border-border">
              <p className="text-muted-text">No FAQs available at the moment.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SupportPage;
