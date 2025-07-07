import React, { createContext, useContext, useState, ReactNode } from 'react';

interface EditContextType {
  isEditing: boolean;
  isEditingItems: boolean;
  isEditingVersements: boolean;
  isAnyEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  setIsEditingItems: (editing: boolean) => void;
  setIsEditingVersements: (editing: boolean) => void;
  resetAllEditing: () => void;
}

const EditContext = createContext<EditContextType | undefined>(undefined);

interface EditProviderProps {
  children: ReactNode;
}

export const EditProvider: React.FC<EditProviderProps> = ({ children }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [isEditingVersements, setIsEditingVersements] = useState(false);

  const isAnyEditing = isEditing || isEditingItems || isEditingVersements;

  const resetAllEditing = () => {
    setIsEditing(false);
    setIsEditingItems(false);
    setIsEditingVersements(false);
  };

  const value: EditContextType = {
    isEditing,
    isEditingItems,
    isEditingVersements,
    isAnyEditing,
    setIsEditing,
    setIsEditingItems,
    setIsEditingVersements,
    resetAllEditing,
  };

  return (
    <EditContext.Provider value={value}>
      {children}
    </EditContext.Provider>
  );
};

export const useEdit = (): EditContextType => {
  const context = useContext(EditContext);
  if (!context) {
    throw new Error('useEdit must be used within an EditProvider');
  }
  return context;
};

export default EditContext;