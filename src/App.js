import React, { useState, useCallback } from 'react';
import TemplateBuilder from './components/TemplateBuilder';
import JsonInput from './components/JsonInput';
import ValidationResults from './components/ValidationResults';
import './App.css';

function App() {
  const [template, setTemplate] = useState({});
  const [jsonData, setJsonData] = useState('');
  const [validationResults, setValidationResults] = useState([]);
  const [activeValidation, setActiveValidation] = useState(null);

  const validateJson = useCallback((type) => {
    if (!jsonData.trim()) {
      setValidationResults([]);
      setActiveValidation(type);
      return;
    }

    try {
      const parsedData = JSON.parse(jsonData);
      const results = performValidation(template, parsedData, type);
      setValidationResults(results);
      setActiveValidation(type);
    } catch (error) {
      setValidationResults([{
        field: 'JSON Parse Error',
        expectedType: 'Valid JSON',
        actualType: 'Invalid JSON',
        issueType: 'Parse Error',
        message: error.message
      }]);
      setActiveValidation(type);
    }
  }, [template, jsonData]);

  const performValidation = (template, data, type) => {
    const results = [];
    
    if (type === 'missing' || type === 'all') {
      findMissingFields(template, data, results, '');
    }
    
    if (type === 'additional' || type === 'all') {
      findAdditionalFields(template, data, results, '');
    }
    
    if (type === 'types' || type === 'all') {
      checkDataTypes(template, data, results, '');
    }
    
    return results;
  };

  const findMissingFields = (template, data, results, path) => {
    Object.keys(template).forEach(key => {
      const currentPath = path ? `${path}.${key}` : key;
      if (!(key in data)) {
        results.push({
          field: currentPath,
          expectedType: template[key].type || 'unknown',
          actualType: 'Missing',
          issueType: 'Missing Field'
        });
      } else if (template[key].type === 'object' && template[key].properties) {
        findMissingFields(template[key].properties, data[key] || {}, results, currentPath);
      }
    });
  };

  const findAdditionalFields = (template, data, results, path) => {
    Object.keys(data).forEach(key => {
      const currentPath = path ? `${path}.${key}` : key;
      if (!(key in template)) {
        results.push({
          field: currentPath,
          expectedType: 'Not defined',
          actualType: typeof data[key],
          issueType: 'Additional Field'
        });
      } else if (template[key] && template[key].type === 'object' && template[key].properties && typeof data[key] === 'object') {
        findAdditionalFields(template[key].properties, data[key], results, currentPath);
      }
    });
  };

  const checkDataTypes = (template, data, results, path) => {
    Object.keys(template).forEach(key => {
      const currentPath = path ? `${path}.${key}` : key;
      if (key in data) {
        const expectedType = template[key].type;
        const actualType = Array.isArray(data[key]) ? 'array' : typeof data[key];
        
        if (expectedType !== actualType) {
          results.push({
            field: currentPath,
            expectedType,
            actualType,
            issueType: 'Type Mismatch'
          });
        } else if (expectedType === 'object' && template[key].properties) {
          checkDataTypes(template[key].properties, data[key], results, currentPath);
        }
      }
    });
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🧩 JSCAN - JSON Validator</h1>
        <p>Define templates and validate JSON data with ease</p>
      </header>
      
      <div className="app-content">
        <div className="left-panel">
          <TemplateBuilder template={template} setTemplate={setTemplate} />
        </div>
        
        <div className="right-panel">
          <JsonInput jsonData={jsonData} setJsonData={setJsonData} />
          
          <div className="validation-controls">
            <button 
              className="validation-btn missing"
              onClick={() => validateJson('missing')}
            >
              ✅ Find Missing Fields
            </button>
            <button 
              className="validation-btn additional"
              onClick={() => validateJson('additional')}
            >
              🚫 Find Additional Fields
            </button>
            <button 
              className="validation-btn types"
              onClick={() => validateJson('types')}
            >
              🔎 Check Data Types
            </button>
          </div>
          
          <ValidationResults
            results={validationResults}
            activeValidation={activeValidation}
            template={template}
            jsonData={jsonData}
            parsedJsonData={jsonData.trim() ? (() => {
              try { return JSON.parse(jsonData); } catch { return null; }
            })() : null}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
