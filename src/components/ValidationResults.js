import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './ValidationResults.css';

const ValidationResults = ({ results, activeValidation, template, jsonData, parsedJsonData }) => {
  const [expandedNested, setExpandedNested] = React.useState(new Set());
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

    // Create table structure with nested tables
    const tableData = dataArray.map((item, index) => {
      const row = {
        rowIndex: isArrayData ? index + 1 : 'Single Object',
        ...allProperties.reduce((acc, prop) => {
          const value = getNestedValue(item, prop);
          const hasValue = value !== undefined && value !== null;
          const expectedType = getExpectedType(template, prop);
          const actualType = hasValue ? (Array.isArray(value) ? 'array' : typeof value) : 'missing';
          const templateDef = getTemplateDefinition(template, prop);

          // Check if this is an array of objects that should be displayed as nested table
          const isNestedTable = hasValue && Array.isArray(value) &&
                                templateDef?.items?.type === 'object' &&
                                templateDef?.items?.properties;

          acc[prop] = {
            value: hasValue ? value : '❌',
            hasValue,
            expectedType,
            actualType,
            isValid: hasValue && (actualType === expectedType || (expectedType === 'array' && Array.isArray(value))),
            isNestedTable,
            nestedTableData: isNestedTable ? createNestedTableData(value, templateDef.items.properties) : null
          };
          return acc;
        }, {})
      };
      return row;
    });

    return { tableData, allProperties, isArrayData };
  };

  const createNestedTableData = (arrayData, objectTemplate) => {
    if (!Array.isArray(arrayData) || !objectTemplate) return null;

    const nestedProperties = Object.keys(objectTemplate);
    const nestedTableData = arrayData.map((item, index) => {
      const row = {
        rowIndex: index + 1,
        ...nestedProperties.reduce((acc, prop) => {
          const value = item?.[prop];
          const hasValue = value !== undefined && value !== null;
          const expectedType = objectTemplate[prop]?.type || 'unknown';
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

    return { tableData: nestedTableData, properties: nestedProperties };
  };

  const getTemplateDefinition = (template, path) => {
    const keys = path.split('.');
    let current = template;

    for (const key of keys) {
      if (current[key]) {
        if (keys.indexOf(key) === keys.length - 1) {
          return current[key];
        } else if (current[key].type === 'object' && current[key].properties) {
          current = current[key].properties;
        }
      }
    }
    return null;
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
        return 'Missing Fields Validation';
      case 'additional':
        return 'Additional Fields Validation';
      case 'types':
        return 'Data Types Validation';
      default:
        return 'Validation Results';
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

  const toggleNestedTable = (rowIndex, prop) => {
    const key = `${rowIndex}-${prop}`;
    const newExpanded = new Set(expandedNested);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedNested(newExpanded);
  };

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
                          {cellData.isNestedTable ? (
                            <div className="nested-table-container">
                              <div
                                className="nested-table-header clickable"
                                onClick={() => toggleNestedTable(index, prop)}
                              >
                                <span className="expand-icon">
                                  {expandedNested.has(`${index}-${prop}`) ? '▼' : '▶'}
                                </span>
                                Array of Objects ({cellData.value.length} items)
                              </div>
                              {expandedNested.has(`${index}-${prop}`) && (
                                <table className="nested-table">
                                  <thead>
                                    <tr>
                                      <th className="nested-index-header">Index</th>
                                      {cellData.nestedTableData.properties.map(nestedProp => (
                                        <th key={nestedProp} className="nested-property-header">
                                          {nestedProp}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {cellData.nestedTableData.tableData.map((nestedRow, nestedIndex) => (
                                      <tr key={nestedIndex} className="nested-data-row">
                                        <td className="nested-index-cell">{nestedRow.rowIndex}</td>
                                        {cellData.nestedTableData.properties.map(nestedProp => {
                                          const nestedCellData = nestedRow[nestedProp];
                                          return (
                                            <td
                                              key={nestedProp}
                                              className={`nested-property-cell ${nestedCellData?.hasValue ? 'has-value' : 'missing-value'} ${nestedCellData?.isValid ? 'valid-type' : 'invalid-type'}`}
                                            >
                                              {nestedCellData?.hasValue ? (
                                                <span className="nested-cell-value">
                                                  {typeof nestedCellData.value === 'object' ? JSON.stringify(nestedCellData.value) : String(nestedCellData.value)}
                                                  {!nestedCellData.isValid && <span className="type-mismatch">⚠️</span>}
                                                </span>
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
                              )}
                            </div>
                          ) : (
                            <span className="cell-value">
                              {typeof cellData.value === 'object' ? JSON.stringify(cellData.value) : String(cellData.value)}
                            </span>
                          )}
                          {!cellData.isValid && !cellData.isNestedTable && <span className="type-mismatch">⚠️</span>}
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
              <div className="no-results-icon">✓</div>
              <h4>No Issues Found!</h4>
              <p>
                {activeValidation === 'missing' && 'All template fields are present in the JSON data.'}
                {activeValidation === 'additional' && 'No additional fields found in the JSON data.'}
                {activeValidation === 'types' && 'All data types match the template specification.'}
              </p>
            </>
          ) : (
            <div className="empty-state">
              <p>Click a validation button above to see results</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ValidationResults;
