import { createContext, useContext, useReducer, useCallback } from 'react';

const AppContext = createContext(null);

const initialState = {
  fileId: null,
  fileMeta: null,       // { originalName, sizeMb, uploadedAt, pageCount, charCount, chunks }
  selectedTypes: [],    // ['mcq', 'true_false', ...]
  countPerType: 5,      // 1–20
  results: null,        // { questions, meta }
  loading: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FILE':
      return {
        ...state,
        fileId: action.payload.fileId,
        fileMeta: action.payload.meta,
        error: null,
        // Reset downstream state when new file is uploaded
        selectedTypes: [],
        countPerType: 5,
        results: null,
      };

    case 'SET_SELECTED_TYPES':
      return { ...state, selectedTypes: action.payload };

    case 'SET_COUNT':
      return { ...state, countPerType: action.payload };

    case 'SET_RESULTS':
      return { ...state, results: action.payload, loading: false, error: null };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setFile = useCallback((fileId, meta) => {
    dispatch({ type: 'SET_FILE', payload: { fileId, meta } });
  }, []);

  const toggleType = useCallback((type) => {
    dispatch({
      type: 'SET_SELECTED_TYPES',
      payload: state.selectedTypes.includes(type)
        ? state.selectedTypes.filter((t) => t !== type)
        : [...state.selectedTypes, type],
    });
  }, [state.selectedTypes]);

  const setSelectedTypes = useCallback((types) => {
    dispatch({ type: 'SET_SELECTED_TYPES', payload: types });
  }, []);

  const setCount = useCallback((count) => {
    dispatch({ type: 'SET_COUNT', payload: count });
  }, []);

  const setResults = useCallback((results) => {
    dispatch({ type: 'SET_RESULTS', payload: results });
  }, []);

  const setLoading = useCallback((loading) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const value = {
    ...state,
    setFile,
    toggleType,
    setSelectedTypes,
    setCount,
    setResults,
    setLoading,
    setError,
    reset,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside <AppProvider>');
  return ctx;
}
