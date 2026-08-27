import { createContext, useContext, useState, useCallback } from 'react';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    message: '',
    resolve: null,
  });

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        message,
        resolve,
      });
    });
  }, []);

  const handleConfirm = () => {
    if (confirmState.resolve) {
      confirmState.resolve(true);
    }
    setConfirmState({ isOpen: false, message: '', resolve: null });
  };

  const handleCancel = () => {
    if (confirmState.resolve) {
      confirmState.resolve(false);
    }
    setConfirmState({ isOpen: false, message: '', resolve: null });
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      
      {/* Sleek Modal for Mobile and Desktop */}
      <Modal isOpen={confirmState.isOpen} onClose={handleCancel} title="Confirm Action">
        <div className="space-y-6">
          <p className="text-on-surface text-[15px]">{confirmState.message}</p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleCancel} className="flex-1 font-semibold">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirm} className="flex-1 font-semibold bg-primary hover:bg-primary-dark">
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
