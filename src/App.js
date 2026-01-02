import React, { useState, useCallback, useMemo } from 'react';
import TemplateBuilder from './components/TemplateBuilder';
import JsonInput from './components/JsonInput';
import ValidationResults from './components/ValidationResults';
import './App.css';
import './components/GlobalHeader.css';
import './components/GlobalFooter.css';

function App() {
  const [template, setTemplate] = useState({});
  const [jsonData, setJsonData] = useState('');
  const [validationResults, setValidationResults] = useState([]);
  const [activeValidation, setActiveValidation] = useState(null);

  const normalizedTemplate = useMemo(() => (Array.isArray(template) ? (template[0] || {}) : template), [template]);

  const validateJson = useCallback((type) => {
    // Check if template is empty
    if (!normalizedTemplate || Object.keys(normalizedTemplate).length === 0) {
      setValidationResults([{
        field: 'Template Error',
        expectedType: 'Valid Template',
        actualType: 'Empty Template',
        issueType: 'Parse Error',
        message: 'Please define a template before validating'
      }]);
      setActiveValidation(type);
      return;
    }

    if (!jsonData.trim()) {
      setValidationResults([{
        field: 'Data Error',
        expectedType: 'Valid JSON Data',
        actualType: 'Empty Data',
        issueType: 'Parse Error',
        message: 'Please provide JSON data to validate'
      }]);
      setActiveValidation(type);
      return;
    }

    try {
      const parsedData = JSON.parse(jsonData);

      // Validate that parsedData is an object or array
      if (typeof parsedData !== 'object' || parsedData === null) {
        setValidationResults([{
          field: 'Data Error',
          expectedType: 'Object or Array',
          actualType: typeof parsedData,
          issueType: 'Parse Error',
          message: 'JSON data must be an object or array of objects'
        }]);
        setActiveValidation(type);
        return;
      }

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
        // Field exists in template but not in data - it's missing
        results.push({
          field: currentPath,
          expectedType: template[key].type || 'unknown',
          actualType: 'Missing',
          issueType: 'Missing Field'
        });
      } else if (template[key].type === 'object' && template[key].properties) {
        // Recursively check nested objects
        const value = data[key];
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          findMissingFields(template[key].properties, value, results, currentPath);
        }
      } else if (template[key].type === 'array' && Array.isArray(data[key]) && template[key].items && template[key].items.type === 'object' && template[key].items.properties) {
        // Check for missing fields in array items
        data[key].forEach((item, idx) => {
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            findMissingFields(template[key].items.properties, item, results, `${currentPath}[${idx}]`);
          }
        });
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
        // Field exists in data but not in template - it's additional
        const value = data[key];
        results.push({
          field: currentPath,
          expectedType: 'Not defined in template',
          actualType: Array.isArray(value) ? 'array' : (value === null ? 'null' : typeof value),
          issueType: 'Additional Field'
        });
        // If the additional field is an object, recursively check its nested fields too
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          findAdditionalFieldsInUnknownObject(value, results, currentPath);
        }
      } else if (template[key] && template[key].type === 'object' && template[key].properties && typeof data[key] === 'object' && data[key] !== null && !Array.isArray(data[key])) {
        // Recursively check nested objects that exist in template
        findAdditionalFields(template[key].properties, data[key], results, currentPath);
      } else if (template[key] && template[key].type === 'array' && Array.isArray(data[key]) && template[key].items && template[key].items.type === 'object' && template[key].items.properties) {
        // Check for additional fields in array items
        data[key].forEach((item, idx) => {
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            findAdditionalFields(template[key].items.properties, item, results, `${currentPath}[${idx}]`);
          }
        });
      }
    });
  };

  // Helper function to find all fields in an object not defined in template
  const findAdditionalFieldsInUnknownObject = (obj, results, path) => {
    Object.keys(obj || {}).forEach(key => {
      const currentPath = `${path}.${key}`;
      const value = obj[key];
      results.push({
        field: currentPath,
        expectedType: 'Not defined in template',
        actualType: Array.isArray(value) ? 'array' : (value === null ? 'null' : typeof value),
        issueType: 'Additional Field'
      });
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        findAdditionalFieldsInUnknownObject(value, results, currentPath);
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
    <>
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

    <footer className="global-footer">
      <div className="global-footer__inner">
        <div className="global-footer__copyright">
          <span className="global-footer__copyright-symbol">©</span>
          <span>Copyright</span>
          <span className="global-footer__brand">BAR</span>
        </div>
        <div className="global-footer__contact">
          <span>Contact:</span>
          <a
            href="mailto:build.and.render1998@gmail.com"
            className="global-footer__email"
          >
            build.and.render1998@gmail.com
          </a>
        </div>
      </div>
    </footer>
    </>
  );
}

export default App;
