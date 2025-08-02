import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './ValidationResults.css';

const ValidationResults = ({ results, activeValidation, template, jsonData, parsedJsonData }) => {
  const createDataTable = () => {
    if (!parsedJsonData || !template || Object.keys(template).length === 0) {
      return null;
    }

    try {
      return generateEnhancedTable(parsedJsonData, template, activeValidation);
    } catch (error) {
      console.error('Error creating enhanced table:', error);
      return null;
    }
  };

  const generateEnhancedTable = (jsonData, template, validationType) => {
    const allProperties = getAllProperties(template);

    // Check if jsonData is an array of objects or single object
    const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
    const isArrayData = Array.isArray(jsonData);

    // Create table structure
    const tableData = dataArray.map((item, index) => {
      const row = {
        rowIndex: isArrayData ? index + 1 : 'Single Object',
        ...allProperties.reduce((acc, prop) => {
          const value = getNestedValue(item, prop);
          const hasValue = value !== undefined && value !== null;
          const expectedType = getExpectedType(template, prop);
          const actualType = hasValue ? (Array.isArray(value) ? 'array' : typeof value) : 'missing';

          acc[prop] = {
            value: hasValue ? value : '❌',
            hasValue,
            expectedType,
            actualType,
            isValid: hasValue && (actualType === expectedType || (expectedType === 'array' && Array.isArray(value)))
          };
          return acc;
        }, {})
      };
      return row;
    });

    return { tableData, allProperties, isArrayData };
  };

  const getAllProperties = (template) => {
    const props = new Set();

    const traverse = (obj, prefix = '') => {
      Object.keys(obj).forEach(key => {
        if (obj[key] && typeof obj[key] === 'object') {
          if (obj[key].type === 'object' && obj[key].properties) {
            traverse(obj[key].properties, prefix ? `${prefix}.${key}` : key);
          } else if (obj[key].type && obj[key].type !== 'object') {
            props.add(prefix ? `${prefix}.${key}` : key);
          }
        } else {
          props.add(prefix ? `${prefix}.${key}` : key);
        }
      });
    };

    traverse(template);
    return Array.from(props);
  };

  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  };

  const getExpectedType = (template, path) => {
    const keys = path.split('.');
    let current = template;

    for (const key of keys) {
      if (current[key]) {
        if (current[key].type) {
          if (keys.indexOf(key) === keys.length - 1) {
            return current[key].type;
          } else if (current[key].type === 'object' && current[key].properties) {
            current = current[key].properties;
          }
        }
      }
    }
    return 'unknown';
  };

  const enhancedTable = createDataTable();
  const columnDefs = useMemo(() => [
    {
      headerName: 'Field Name',
      field: 'field',
      flex: 2,
      minWidth: 200,
      cellRenderer: (params) => (
        <span className="field-name-cell">
          📋 {params.value}
        </span>
      )
    },
    {
      headerName: 'Expected Type',
      field: 'expectedType',
      flex: 1,
      minWidth: 120,
      cellRenderer: (params) => (
        <span className="expected-type-cell">
          {params.value}
        </span>
      )
    },
    {
      headerName: 'Actual Type',
      field: 'actualType',
      flex: 1,
      minWidth: 120,
      cellRenderer: (params) => (
        <span className="actual-type-cell">
          {params.value}
        </span>
      )
    },
    {
      headerName: 'Issue Type',
      field: 'issueType',
      flex: 1,
      minWidth: 150,
      cellRenderer: (params) => {
        const getIcon = (issueType) => {
          switch (issueType) {
            case 'Missing Field': return '❌';
            case 'Additional Field': return '➕';
            case 'Type Mismatch': return '🔄';
            case 'Parse Error': return '💥';
            default: return '❓';
          }
        };
        
        const getClassName = (issueType) => {
          switch (issueType) {
            case 'Missing Field': return 'issue-missing';
            case 'Additional Field': return 'issue-additional';
            case 'Type Mismatch': return 'issue-mismatch';
            case 'Parse Error': return 'issue-error';
            default: return 'issue-unknown';
          }
        };
        
        return (
          <span className={`issue-type-cell ${getClassName(params.value)}`}>
            {getIcon(params.value)} {params.value}
          </span>
        );
      }
    }
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 100
  }), []);

  const getValidationTitle = () => {
    switch (activeValidation) {
      case 'missing':
        return '✅ Missing Fields Validation';
      case 'additional':
        return '🚫 Additional Fields Validation';
      case 'types':
        return '🔎 Data Types Validation';
      default:
        return '📊 Validation Results';
    }
  };

  const getValidationDescription = () => {
    switch (activeValidation) {
      case 'missing':
        return 'Fields that exist in the template but are missing from the JSON data';
      case 'additional':
        return 'Fields that exist in the JSON data but are not defined in the template';
      case 'types':
        return 'Fields where the data type doesn\'t match the template specification';
      default:
        return 'Click a validation button above to see results';
    }
  };

  const getResultsSummary = () => {
    if (!results.length) return null;
    
    const summary = results.reduce((acc, result) => {
      acc[result.issueType] = (acc[result.issueType] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="results-summary">
        {Object.entries(summary).map(([type, count]) => {
          const getIcon = (issueType) => {
            switch (issueType) {
              case 'Missing Field': return '❌';
              case 'Additional Field': return '➕';
              case 'Type Mismatch': return '🔄';
              case 'Parse Error': return '💥';
              default: return '❓';
            }
          };
          
          return (
            <div key={type} className="summary-item">
              {getIcon(type)} {count} {type}{count > 1 ? 's' : ''}
            </div>
          );
        })}
      </div>
    );
  };

  const enhancedTableData = createDataTable();

  const renderEnhancedTable = () => {
    if (!enhancedTableData) return null;

    const { tableData, allProperties, isArrayData } = enhancedTableData;

    return (
      <div className="enhanced-table-container">
        <table className="enhanced-validation-table">
          <thead>
            <tr>
              {isArrayData && <th className="row-index-header">Index</th>}
              {!isArrayData && <th className="row-index-header">Property</th>}
              {allProperties.map(prop => (
                <th key={prop} className="property-header">
                  {prop}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => (
              <tr key={index} className="data-row">
                <td className="row-index-cell">
                  {row.rowIndex}
                </td>
                {allProperties.map(prop => {
                  const cellData = row[prop];
                  return (
                    <td
                      key={prop}
                      className={`property-cell ${cellData?.hasValue ? 'has-value' : 'missing-value'} ${cellData?.isValid ? 'valid-type' : 'invalid-type'}`}
                      title={cellData ? `Expected: ${cellData.expectedType}, Actual: ${cellData.actualType}` : ''}
                    >
                      {cellData?.hasValue ? (
                        <div className="cell-content">
                          <span className="cell-value">
                            {typeof cellData.value === 'object' ? JSON.stringify(cellData.value) : String(cellData.value)}
                          </span>
                          {!cellData.isValid && <span className="type-mismatch">⚠️</span>}
                        </div>
                      ) : (
                        <span className="missing-indicator">❌</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="validation-results">
      <div className="results-header">
        <h3>{getValidationTitle()}</h3>
        <p className="results-description">{getValidationDescription()}</p>
        {getResultsSummary()}
      </div>

      {enhancedTableData ? (
        renderEnhancedTable()
      ) : parsedJsonData && template && Object.keys(template).length > 0 ? (
        <div className="ag-theme-alpine results-grid">
          <AgGridReact
            rowData={results}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            headerHeight={45}
            rowHeight={50}
            suppressRowClickSelection={true}
            suppressCellFocus={true}
            animateRows={true}
            enableRangeSelection={false}
            suppressMenuHide={true}
          />
        </div>
      ) : (
        <div className="no-results">
          {activeValidation ? (
            <>
              <div className="no-results-icon">🎉</div>
              <h4>No Issues Found!</h4>
              <p>
                {activeValidation === 'missing' && 'All template fields are present in the JSON data.'}
                {activeValidation === 'additional' && 'No additional fields found in the JSON data.'}
                {activeValidation === 'types' && 'All data types match the template specification.'}
              </p>
            </>
          ) : (
            <>
              <div className="no-results-icon">📊</div>
              <h4>Ready for Validation</h4>
              <p>
                Create a template on the left, add JSON data above, then click a validation button to see results here.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ValidationResults;
