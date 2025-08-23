import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import Modal from './Modal';
import './ValidationResults.css';

const ValidationResults = ({ results, activeValidation, template, jsonData, parsedJsonData }) => {
  const [expandedNested, setExpandedNested] = React.useState(new Set());
  const [modalData, setModalData] = React.useState(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
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
    const allProperties = getAllProperties(template, jsonData, validationType);

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

          // Check if this field is actually an additional field (exists in JSON but not in template)
          const isActuallyAdditional = validationType === 'additional' && !getNestedValue(template, prop);

          acc[prop] = {
            value: hasValue ? value : '❌',
            hasValue,
            expectedType,
            actualType,
            isValid: hasValue && (actualType === expectedType || (expectedType === 'array' && Array.isArray(value))),
            isNestedTable,
            nestedTableData: isNestedTable ? createNestedTableData(value, templateDef.items.properties) : null,
            isActuallyAdditional
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

  const getAllProperties = (template, jsonData = null, validationType = null) => {
    const props = new Set();

    const traverseTemplate = (obj, prefix = '') => {
      Object.keys(obj).forEach(key => {
        if (obj[key] && typeof obj[key] === 'object') {
          if (obj[key].type === 'object' && obj[key].properties) {
            traverseTemplate(obj[key].properties, prefix ? `${prefix}.${key}` : key);
          } else if (obj[key].type && obj[key].type !== 'object') {
            props.add(prefix ? `${prefix}.${key}` : key);
          }
        } else {
          props.add(prefix ? `${prefix}.${key}` : key);
        }
      });
    };

    const traverseJsonData = (obj, prefix = '') => {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;

      Object.keys(obj).forEach(key => {
        const currentPath = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && !Array.isArray(obj[key]) && obj[key] !== null) {
          traverseJsonData(obj[key], currentPath);
        } else {
          props.add(currentPath);
        }
      });
    };

    // Always traverse template
    traverseTemplate(template);

    // For additional fields validation, also traverse JSON data to find extra properties
    if (validationType === 'additional' && jsonData) {
      if (Array.isArray(jsonData)) {
        jsonData.forEach(item => traverseJsonData(item));
      } else {
        traverseJsonData(jsonData);
      }
    }

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

  const hasValidationIssues = () => {
    if (!activeValidation) return false;

    // Use the results array to determine if there are actual issues
    if (results && results.length > 0) {
      switch (activeValidation) {
        case 'missing':
          return results.some(r => r.issueType === 'Missing Field');
        case 'additional':
          return results.some(r => r.issueType === 'Additional Field');
        case 'types':
          return results.some(r => r.issueType === 'Type Mismatch');
        default:
          return results.length > 0;
      }
    }

    return false;
  };

  const getNoIssuesMessage = () => {
    switch (activeValidation) {
      case 'missing':
        return {
          title: 'No Missing Fields',
          message: 'All template fields are present in the JSON data.'
        };
      case 'additional':
        return {
          title: 'No Additional Fields',
          message: 'No additional fields found in the JSON data.'
        };
      case 'types':
        return {
          title: 'No Type Mismatches',
          message: 'All data types match the template specification.'
        };
      default:
        return {
          title: 'No Issues Found',
          message: 'Validation completed successfully.'
        };
    }
  };

  const openNestedTableModal = (nestedTableData, arrayName, arrayLength) => {
    setModalData({
      tableData: nestedTableData.tableData,
      properties: nestedTableData.properties,
      title: `${arrayName} - Array of Objects (${arrayLength} items)`,
      activeValidation
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalData(null);
  };

  const renderModalNestedTable = (data) => {
    if (!data) return null;

    return (
      <table className="modal-nested-table">
        <thead>
          <tr>
            <th className="modal-nested-index-header">Index</th>
            {data.properties.map(prop => (
              <th key={prop} className="modal-nested-property-header">
                {prop}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.tableData.map((row, index) => (
            <tr key={index}>
              <td className="modal-nested-index-cell">{row.rowIndex}</td>
              {data.properties.map(prop => {
                const cellData = row[prop];
                return (
                  <td
                    key={prop}
                    className={`modal-nested-property-cell ${cellData?.hasValue ? 'has-value' : 'missing-value'} ${cellData?.isValid ? 'valid-type' : 'invalid-type'} validation-${data.activeValidation}`}
                  >
                    {cellData?.hasValue ? (
                      <span className="modal-nested-cell-value">
                        {typeof cellData.value === 'object' ? JSON.stringify(cellData.value) : String(cellData.value)}
                        {!cellData.isValid && <span className="type-mismatch"> ⚠️</span>}
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
    );
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
                      className={`property-cell ${cellData?.hasValue ? 'has-value' : 'missing-value'} ${cellData?.isValid ? 'valid-type' : 'invalid-type'} ${cellData?.isActuallyAdditional ? 'actually-additional' : ''} validation-${activeValidation}`}
                      title={cellData ? `Expected: ${cellData.expectedType}, Actual: ${cellData.actualType}` : ''}
                    >
                      {cellData?.hasValue ? (
                        <div className="cell-content">
                          {cellData.isNestedTable ? (
                            <button
                              className="nested-table-button"
                              onClick={() => openNestedTableModal(cellData.nestedTableData, prop, cellData.value.length)}
                            >
                              📋 View {cellData.value.length} items
                            </button>
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

      {enhancedTableData && hasValidationIssues() ? (
        renderEnhancedTable()
      ) : enhancedTableData && activeValidation ? (
        <div className="no-issues-found">
          <div className="no-issues-icon">✓</div>
          <h4>{getNoIssuesMessage().title}</h4>
          <p>{getNoIssuesMessage().message}</p>
        </div>
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

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={modalData?.title || 'Nested Table'}
      >
        {modalData && renderModalNestedTable(modalData)}
      </Modal>
    </div>
  );
};

export default ValidationResults;
