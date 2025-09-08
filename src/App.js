import React, { useState, useCallback, useMemo } from 'react';
import TemplateBuilder from './components/TemplateBuilder';
import JsonInput from './components/JsonInput';
import ValidationResults from './components/ValidationResults';
import './App.css';

function App() {
  const [template, setTemplate] = useState({});
  const [jsonData, setJsonData] = useState('');
  const [validationResults, setValidationResults] = useState([]);
  const [activeValidation, setActiveValidation] = useState(null);

  const normalizedTemplate = useMemo(() => (Array.isArray(template) ? (template[0] || {}) : template), [template]);

  const validateJson = useCallback((type) => {
    if (!jsonData.trim()) {
      setValidationResults([]);
      setActiveValidation(type);
      return;
    }

    try {
      const parsedData = JSON.parse(jsonData);
      const results = performValidation(normalizedTemplate, parsedData, type);
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
  }, [normalizedTemplate, jsonData]);

  const performValidation = (template, data, type) => {
    const results = [];

    const handle = (item, rowIndex = null) => {
      if (type === 'missing') {
        findMissingFields(template, item, results, '');
      } else if (type === 'additional') {
        findAdditionalFields(template, item, results, '');
      } else if (type === 'types') {
        checkDataTypes(template, item, results, '', rowIndex);
      } else if (type === 'all') {
        findMissingFields(template, item, results, '');
        findAdditionalFields(template, item, results, '');
        checkDataTypes(template, item, results, '', rowIndex);
      }
    };

    if (Array.isArray(data)) {
      data.forEach((item, idx) => handle(item, idx + 1));
    } else {
      handle(data, null);
    }

    return results;
  };

  const findMissingFields = (template, data, results, path) => {
    if (Array.isArray(data)) {
      data.forEach(item => findMissingFields(template, item || {}, results, path));
      return;
    }

    Object.keys(template).forEach(key => {
      const currentPath = path ? `${path}.${key}` : key;
      if (!(key in (data || {}))) {
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
    if (Array.isArray(data)) {
      data.forEach(item => findAdditionalFields(template, item || {}, results, path));
      return;
    }

    Object.keys(data || {}).forEach(key => {
      const currentPath = path ? `${path}.${key}` : key;
      if (!(key in template)) {
        results.push({
          field: currentPath,
          expectedType: 'Not defined',
          actualType: Array.isArray(data[key]) ? 'array' : typeof data[key],
          issueType: 'Additional Field'
        });
      } else if (template[key] && template[key].type === 'object' && template[key].properties && typeof data[key] === 'object' && !Array.isArray(data[key])) {
        findAdditionalFields(template[key].properties, data[key], results, currentPath);
      }
    });
  };

  const checkDataTypes = (template, data, results, path, rowIndex = null) => {
    if (Array.isArray(data)) {
      data.forEach((item, idx) => checkDataTypes(template, item, results, path, rowIndex ?? idx + 1));
      return;
    }

    Object.keys(template).forEach(key => {
      const currentPath = path ? `${path}.${key}` : key;
      if (data && key in data) {
        const expectedType = template[key].type;
        const value = data[key];
        const actualType = Array.isArray(value) ? 'array' : typeof value;

        const fieldWithRow = rowIndex ? `row ${rowIndex}: ${currentPath}` : currentPath;

        if (expectedType !== actualType) {
          results.push({
            field: fieldWithRow,
            expectedType,
            actualType,
            issueType: 'Type Mismatch'
          });
        } else if (expectedType === 'object' && template[key].properties && value && typeof value === 'object' && !Array.isArray(value)) {
          checkDataTypes(template[key].properties, value, results, currentPath, rowIndex);
        } else if (expectedType === 'array' && Array.isArray(value) && template[key].items) {
          const itemDef = template[key].items;
          value.forEach((el, i) => {
            const elType = Array.isArray(el) ? 'array' : typeof el;
            const itemPath = `${currentPath}[${i + 1}]`;
            if (itemDef.type === 'object' && itemDef.properties && el && typeof el === 'object' && !Array.isArray(el)) {
              checkDataTypes(itemDef.properties, el, results, itemPath, rowIndex);
            } else if (itemDef.type && itemDef.type !== elType) {
              results.push({
                field: rowIndex ? `row ${rowIndex}: ${itemPath}` : itemPath,
                expectedType: itemDef.type,
                actualType: elType,
                issueType: 'Type Mismatch'
              });
            }
          });
        }
      }
    });
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1><span className="app-logo">J</span>Valido - JSON Validator</h1>
        <p>Define templates and validate JSON data with ease</p>
      </header>
      
      <div className="app-content">
        <div className="top-panels">
          <div className="left-panel">
            <TemplateBuilder template={template} setTemplate={setTemplate} />
          </div>

          <div className="right-panel">
            <JsonInput jsonData={jsonData} setJsonData={setJsonData} />
          </div>
        </div>

        <div className="bottom-panel">
          <div className="validation-controls">
            <button
              className="validation-btn missing"
              onClick={() => validateJson('missing')}
            >
              Find Missing Fields
            </button>
            <button
              className="validation-btn additional"
              onClick={() => validateJson('additional')}
            >
              Find Additional Fields
            </button>
            <button
              className="validation-btn types"
              onClick={() => validateJson('types')}
            >
              Check Data Types
            </button>
          </div>

          <ValidationResults
            results={validationResults}
            activeValidation={activeValidation}
            template={normalizedTemplate}
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
