import React, { useState, useEffect } from 'react';
import './JsonInput.css';

const JsonInput = ({ jsonData, setJsonData }) => {
  const [isValidJson, setIsValidJson] = useState(true);
  const [jsonError, setJsonError] = useState('');
  const [formattedJson, setFormattedJson] = useState('');

  useEffect(() => {
    validateAndFormat(jsonData);
  }, [jsonData]);

  const validateAndFormat = (input) => {
    if (!input.trim()) {
      setIsValidJson(true);
      setJsonError('');
      setFormattedJson('');
      return;
    }

    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, 2);
      setIsValidJson(true);
      setJsonError('');
      setFormattedJson(formatted);
    } catch (error) {
      setIsValidJson(false);
      setJsonError(error.message);
      setFormattedJson('');
    }
  };

  const handleJsonChange = (e) => {
    setJsonData(e.target.value);
  };

  const formatJson = () => {
    if (isValidJson && jsonData.trim()) {
      try {
        const parsed = JSON.parse(jsonData);
        const formatted = JSON.stringify(parsed, null, 2);
        setJsonData(formatted);
      } catch (error) {
        // Error already handled in validateAndFormat
      }
    }
  };

  const clearJson = () => {
    setJsonData('');
  };

  const loadSampleJson = () => {
    const sampleData = {
      "name": "John Doe",
      "age": 30,
      "email": "john@example.com",
      "isActive": true,
      "address": {
        "street": "123 Main St",
        "city": "New York",
        "zipCode": "10001"
      },
      "hobbies": ["reading", "coding", "gaming"],
      "metadata": {
        "createdAt": "2024-01-01",
        "updatedAt": "2024-01-15"
      }
    };
    setJsonData(JSON.stringify(sampleData, null, 2));
  };

  return (
    <div className="json-input">
      <div className="json-input-header">
        <h2>📄 JSON Data Input</h2>
        <div className="json-actions">
          <button onClick={formatJson} className="format-btn" disabled={!isValidJson}>
            🎨 Format
          </button>
          <button onClick={loadSampleJson} className="sample-btn">
            📋 Sample
          </button>
          <button onClick={clearJson} className="clear-btn">
            🗑️ Clear
          </button>
        </div>
      </div>
      
      <div className="json-status">
        {!isValidJson && (
          <div className="json-error">
            ❌ <strong>JSON Error:</strong> {jsonError}
          </div>
        )}
        {isValidJson && jsonData.trim() && (
          <div className="json-valid">
            ✅ <strong>Valid JSON</strong> ({JSON.stringify(JSON.parse(jsonData)).length} characters)
          </div>
        )}
        {!jsonData.trim() && (
          <div className="json-empty">
            💭 Paste your JSON data here or load a sample
          </div>
        )}
      </div>

      <div className="json-textarea-container">
        <textarea
          value={jsonData}
          onChange={handleJsonChange}
          placeholder={`Paste your JSON data here...

Example:
{
  "name": "John Doe",
  "age": 30,
  "email": "john@example.com",
  "isActive": true
}`}
          className={`json-textarea ${!isValidJson ? 'error' : ''}`}
        />
      </div>

      {formattedJson && (
        <div className="json-preview">
          <h3>🔍 Formatted Preview</h3>
          <pre className="formatted-json">{formattedJson}</pre>
        </div>
      )}
    </div>
  );
};

export default JsonInput;
