import { createContext, useContext, useReducer, useCallback } from 'react';

const AppContext = createContext(null);

const DEFAULT_COUNT_PER_TYPE = 5;

const initialState = {
  fileId: null,
  fileMeta: null,       // { originalName, sizeMb, uploadedAt, pageCount, charCount, chunks }
  questionConfig: {},   // e.g. { mcq: 5, true_false: 3 }
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
        questionConfig: {},
        results: null,
      };

    case 'TOGGLE_TYPE': {
      const type = action.payload;
      const newConfig = { ...state.questionConfig };
      if (type in newConfig) {
        delete newConfig[type];
      } else {
        newConfig[type] = DEFAULT_COUNT_PER_TYPE;
      }
      return { ...state, questionConfig: newConfig };
    }

    case 'SET_TYPE_COUNT': {
      const { type: qType, count } = action.payload;
      if (!(qType in state.questionConfig)) return state;
      return {
        ...state,
        questionConfig: { ...state.questionConfig, [qType]: count },
      };
    }

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
    dispatch({ type: 'TOGGLE_TYPE', payload: type });
  }, []);

  const setTypeCount = useCallback((type, count) => {
    dispatch({ type: 'SET_TYPE_COUNT', payload: { type, count } });
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

  // Derive selectedTypes from questionConfig keys for backward compatibility
  const selectedTypes = Object.keys(state.questionConfig);

  const value = {
    ...state,
    selectedTypes,
    setFile,
    toggleType,
    setTypeCount,
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
