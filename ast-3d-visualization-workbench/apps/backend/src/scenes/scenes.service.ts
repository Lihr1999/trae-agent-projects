import { Injectable } from '@nestjs/common';
import { PresetScene } from './scenes.interfaces';

@Injectable()
export class ScenesService {
  private scenes: PresetScene[] = [];

  onModuleInit() {
    this.scenes = [
      this.createReactNestingScene(),
      this.createDeepClosureScene(),
      this.createLargeScaleScene(),
      this.createSyntaxErrorScene(),
    ];
  }

  getAllScenes(): PresetScene[] {
    return this.scenes;
  }

  getSceneById(id: number): PresetScene | null {
    return this.scenes.find((s) => s.id === id) || null;
  }

  private createReactNestingScene(): PresetScene {
    const sourceCode = `import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

const App = () => {
  return (
    <div className="app-container">
      <header className="app-header">
        <nav className="main-nav">
          <ul className="nav-list">
            <li className="nav-item">
              <a href="/" className="nav-link">
                <span className="link-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                  </svg>
                </span>
                <span className="link-text">Home</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="/about" className="nav-link">
                <span className="link-icon">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </span>
                <span className="link-text">About</span>
              </a>
            </li>
          </ul>
        </nav>
      </header>
      <main className="app-main">
        <Dashboard>
          <Sidebar>
            <SidebarSection title="Navigation">
              <SidebarMenu>
                <SidebarMenuItem icon="home" label="Dashboard" active={true} />
                <SidebarMenuItem icon="user" label="Profile" />
                <SidebarMenuItem icon="settings" label="Settings" />
              </SidebarMenu>
            </SidebarSection>
            <SidebarSection title="Data">
              <SidebarMenu>
                <SidebarMenuItem icon="chart" label="Analytics" />
                <SidebarMenuItem icon="table" label="Reports" />
              </SidebarMenu>
            </SidebarSection>
          </Sidebar>
          <Content>
            <PageHeader title="Dashboard" subtitle="Overview">
              <Breadcrumb>
                <BreadcrumbItem>Home</BreadcrumbItem>
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
                <BreadcrumbItem active>Dashboard</BreadcrumbItem>
              </Breadcrumb>
              <PageActions>
                <Button variant="primary" size="medium">
                  <Icon name="plus" />
                  <span>New Item</span>
                </Button>
                <Button variant="secondary" size="medium">
                  <Icon name="download" />
                  <span>Export</span>
                </Button>
              </PageActions>
            </PageHeader>
            <CardGrid columns={3}>
              <StatCard title="Total Users" value="12,345" trend="up" percentage="+12.5%">
                <MiniChart data={[1, 2, 3, 5, 4, 7, 6]} />
              </StatCard>
              <StatCard title="Revenue" value="$48,290" trend="up" percentage="+8.2%">
                <MiniChart data={[3, 4, 3, 6, 5, 8, 7]} />
              </StatCard>
              <StatCard title="Active Sessions" value="1,024" trend="down" percentage="-3.1%">
                <MiniChart data={[7, 6, 5, 4, 3, 4, 3]} />
              </StatCard>
              <DataTable columns={["Name", "Status", "Value"]} data={sampleData}>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell sortable>Name</TableHeaderCell>
                    <TableHeaderCell sortable>Status</TableHeaderCell>
                    <TableHeaderCell sortable>Value</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <UserAvatar name={item.name} size="small">
                          <StatusBadge status={item.status} />
                        </UserAvatar>
                      </TableCell>
                      <TableCell>
                        <StatusTag status={item.status}>
                          <StatusDot color={getStatusColor(item.status)} />
                          <span>{item.status}</span>
                        </StatusTag>
                      </TableCell>
                      <TableCell>
                        <FormattedValue value={item.value} type="currency" />
                      </TableCell>
                      <TableCell>
                        <ActionGroup>
                          <IconButton icon="edit" onClick={() => handleEdit(item)} />
                          <IconButton icon="delete" onClick={() => handleDelete(item)} />
                          <DropdownMenu>
                            <DropdownItem>View Details</DropdownItem>
                            <DropdownItem>Archive</DropdownItem>
                            <DropdownSeparator />
                            <DropdownItem danger>Delete Permanently</DropdownItem>
                          </DropdownMenu>
                        </ActionGroup>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </DataTable>
            </CardGrid>
          </Content>
        </Dashboard>
      </main>
      <footer className="app-footer">
        <FooterLinks>
          <FooterLink href="/privacy">Privacy</FooterLink>
          <FooterLink href="/terms">Terms</FooterLink>
          <FooterLink href="/contact">Contact</FooterLink>
        </FooterLinks>
      </footer>
    </div>
  );
};

const mapStateToProps = (state) => ({
  user: state.auth.user,
  settings: state.settings,
});

export default withRouter(connect(mapStateToProps)(App));`;

    return {
      id: 1,
      name: 'React巨型嵌套JSX组件树',
      description: 'A React component with deeply nested JSX (5+ levels of div nesting, multiple component nesting) demonstrating complex component hierarchies with nested UI elements.',
      language: 'javascript',
      sourceCode,
      tags: ['react', 'jsx', 'nesting', 'component-tree'],
    };
  }

  private createDeepClosureScene(): PresetScene {
    const sourceCode = `(function(global) {
  'use strict';
  var _0x1a2b = (function() {
    var _0x3c4d = (function() {
      var _0x5e6f = (function() {
        var _0x7g8h = (function() {
          var _0x9i0j = (function() {
            var _0x1k2l = (function() {
              var _0x3m4n = (function() {
                var _0x5o6p = (function() {
                  var _0x7q8r = (function() {
                    var _0x9s0t = (function() {
                      var secret = Math.random().toString(36);
                      return function(x) {
                        return (function(y) {
                          return (function(z) {
                            return (function(w) {
                              return (function(v) {
                                return secret + x + y + z + w + v;
                              })(z * 2);
                            })(y + 1);
                          })(x * 3);
                        })(x + 7);
                      };
                    })();
                    return { encode: _0x9s0t, decode: function(v) { return v; } };
                  })();
                  return { module: _0x7q8r, version: '1.0.0' };
                })();
                return { factory: _0x5o6p, init: function() { return _0x5o6p; } };
              })();
              return { create: function() { return new _0x3m4n.factory(); } };
            })();
            return { instance: _0x1k2l, bootstrap: _0x1k2l.create };
          })();
          return { core: _0x9i0j, start: _0x9i0j.bootstrap };
        })();
        return { engine: _0x7g8h, run: _0x7g8h.start };
      })();
      return { system: _0x5e6f, execute: _0x5e6f.run };
    })();
    return { platform: _0x3c4d, launch: _0x3c4d.execute };
  })();

  var ModuleA = (function() {
    var _priv = (function() {
      var _deep = (function() {
        var _deeper = (function() {
          var state = { count: 0, data: [] };
          return {
            increment: function() { state.count++; },
            getData: function() { return state.data.slice(); },
            process: function(item) {
              return (function(transform) {
                return (function(validate) {
                  return (function(format) {
                    return (function(output) {
                      return output(format(validate(transform(item))));
                    })(function(v) { return { result: v }; });
                  })(function(v) { return typeof v === 'string' ? v : JSON.stringify(v); });
                })(function(v) { return v !== null && v !== undefined; });
              })(function(v) { return v * 2; });
            }
          };
        })();
        return _deeper;
      })();
      return _deep;
    })();

    return {
      name: 'ModuleA',
      process: function(data) {
        return (function(step1) {
          return (function(step2) {
            return (function(step3) {
              return (function(step4) {
                return (function(step5) {
                  return step5;
                })(step4.filter(Boolean));
              })(step3.map(function(x) { return x.value; }));
            })(step2.reduce(function(a, b) { return a.concat(b); }, []));
          })(step1.sort());
        })(data.split(',').map(Number));
      }
    };
  })();

  var EventEmitter = (function() {
    var _listeners = (function() {
      var _storage = (function() {
        var _inner = {};
        return {
          get: function(key) {
            return (function(bucket) {
              return (function(entries) {
                return entries.filter(function(e) { return e.active; });
              })(bucket || []);
            })(_inner[key]);
          },
          set: function(key, value) {
            _inner[key] = (function(existing) {
              return (function(merged) {
                return merged;
              })((existing || []).concat([value]));
            })(_inner[key]);
          }
        };
      })();
      return _storage;
    })();

    return {
      on: function(event, fn) { _listeners.set(event, { fn: fn, active: true }); },
      emit: function(event, data) {
        _listeners.get(event).forEach(function(listener) {
          (function(delayed) {
            (function(scheduled) {
              scheduled();
            })(function() { delayed.fn(data); });
          })(listener);
        });
      }
    };
  })();

  global.ObfuscatedApp = {
    platform: _0x1a2b,
    moduleA: ModuleA,
    events: EventEmitter,
    init: function() {
      return (function(config) {
        return (function(initialized) {
          return (function(ready) {
            return ready;
          })(initialized);
        })(config);
      })({ debug: false, version: '2.0.0' });
    }
  };
})(typeof window !== 'undefined' ? window : global);`;

    return {
      id: 2,
      name: '包含深层闭包的混淆JS代码',
      description: 'Obfuscated JavaScript with deeply nested closures (IIFEs within IIFEs, 10+ levels) demonstrating closure nesting patterns and obfuscation techniques.',
      language: 'javascript',
      sourceCode,
      tags: ['obfuscation', 'closures', 'iife', 'deep-nesting'],
    };
  }

  private createLargeScaleScene(): PresetScene {
    const lines: string[] = [];

    lines.push('// Auto-generated large-scale JavaScript file for AST stress testing');
    lines.push('// Simulates a codebase with thousands of functions and nested structures');
    lines.push('');
    lines.push('"use strict";');
    lines.push('');

    lines.push('const CONFIG = {');
    lines.push('  version: "3.0.0",');
    lines.push('  debug: false,');
    lines.push('  maxRetries: 3,');
    lines.push('  timeout: 5000,');
    lines.push('  endpoints: { api: "/api/v1", auth: "/auth" }');
    lines.push('};');
    lines.push('');

    const moduleNames = ['core', 'utils', 'helpers', 'services', 'models', 'controllers', 'middleware', 'validators', 'transformers', 'adapters'];
    const funcTypes = ['processData', 'validateInput', 'transformOutput', 'handleError', 'formatResponse', 'parseRequest', 'computeResult', 'cacheValue', 'fetchRemote', 'dispatchEvent'];

    for (let moduleIdx = 0; moduleIdx < moduleNames.length; moduleIdx++) {
      const moduleName = moduleNames[moduleIdx];
      lines.push(`const ${moduleName} = (() => {`);
      lines.push(`  const _state = { initialized: false, data: [] };`);
      lines.push('');

      for (let funcIdx = 0; funcIdx < funcTypes.length; funcIdx++) {
        const funcName = funcTypes[funcIdx];
        lines.push(`  function ${funcName}(input) {`);
        lines.push(`    if (!_state.initialized) {`);
        lines.push(`      throw new Error("Module not initialized");`);
        lines.push(`    }`);
        lines.push(`    const validated = (() => {`);
        lines.push(`      if (typeof input === "string") {`);
        lines.push(`        return input.trim();`);
        lines.push(`      }`);
        lines.push(`      if (Array.isArray(input)) {`);
        lines.push(`        return input.map(item => {`);
        lines.push(`          if (typeof item === "object" && item !== null) {`);
        lines.push(`            return Object.keys(item).reduce((acc, key) => {`);
        lines.push(`              acc[key] = typeof item[key] === "function" ? item[key]() : item[key];`);
        lines.push(`              return acc;`);
        lines.push(`            }, {});`);
        lines.push(`          }`);
        lines.push(`          return item;`);
        lines.push(`        });`);
        lines.push(`      }`);
        lines.push(`      return input;`);
        lines.push(`    })();`);
        lines.push('');

        lines.push(`    const processed = (() => {`);
        lines.push(`      try {`);
        lines.push(`        const result = (function transform(data) {`);
        lines.push(`          if (data === null || data === undefined) {`);
        lines.push(`            return null;`);
        lines.push(`          }`);
        lines.push(`          switch (typeof data) {`);
        lines.push(`            case "string":`);
        lines.push(`              return data.toUpperCase();`);
        lines.push(`            case "number":`);
        lines.push(`              return data * 2;`);
        lines.push(`            case "boolean":`);
        lines.push(`              return !data;`);
        lines.push(`            case "object":`);
        lines.push(`              return JSON.stringify(data);`);
        lines.push(`            default:`);
        lines.push(`              return String(data);`);
        lines.push(`          }`);
        lines.push(`        })(validated);`);
        lines.push(`        return result;`);
        lines.push(`      } catch (error) {`);
        lines.push(`        console.error(\`Error in ${funcName}:\`, error);`);
        lines.push(`        return null;`);
        lines.push(`      }`);
        lines.push(`    })();`);
        lines.push('');

        lines.push(`    return processed;`);
        lines.push(`  }`);
        lines.push('');
      }

      lines.push(`  class ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Manager {`);
      lines.push(`    constructor(options = {}) {`);
      lines.push(`      this.options = { ...CONFIG, ...options };`);
      lines.push(`      this.cache = new Map();`);
      lines.push(`      this.listeners = new Set();`);
      lines.push(`      this._state = _state;`);
      lines.push(`    }`);
      lines.push('');

      lines.push(`    initialize() {`);
      lines.push(`      this._state.initialized = true;`);
      lines.push(`      this._state.data = [];`);
      lines.push(`      return this;`);
      lines.push(`    }`);
      lines.push('');

      lines.push(`    process(input) {`);
      lines.push(`      const key = JSON.stringify(input);`);
      lines.push(`      if (this.cache.has(key)) {`);
      lines.push(`        return this.cache.get(key);`);
      lines.push(`      }`);
      lines.push(`      const result = ${funcTypes[moduleIdx % funcTypes.length]}(input);`);
      lines.push(`      this.cache.set(key, result);`);
      lines.push(`      return result;`);
      lines.push(`    }`);
      lines.push('');

      lines.push(`    batchProcess(inputs) {`);
      lines.push(`      return inputs.map(input => this.process(input));`);
      lines.push(`    }`);
      lines.push('');

      lines.push(`    on(event, callback) {`);
      lines.push(`      this.listeners.add({ event, callback });`);
      lines.push(`    }`);
      lines.push('');

      lines.push(`    emit(event, data) {`);
      lines.push(`      for (const listener of this.listeners) {`);
      lines.push(`        if (listener.event === event) {`);
      lines.push(`          listener.callback(data);`);
      lines.push(`        }`);
      lines.push(`      }`);
      lines.push(`    }`);
      lines.push('');

      lines.push(`    destroy() {`);
      lines.push(`      this.cache.clear();`);
      lines.push(`      this.listeners.clear();`);
      lines.push(`      this._state.initialized = false;`);
      lines.push(`    }`);
      lines.push(`  }`);
      lines.push('');

      lines.push(`  return {`);
      for (const fn of funcTypes) {
        lines.push(`    ${fn},`);
      }
      lines.push(`    Manager: ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Manager,`);
      lines.push(`  };`);
      lines.push(`})();`);
      lines.push('');
    }

    lines.push('class Application {');
    lines.push('  constructor(config = CONFIG) {');
    lines.push('    this.config = config;');
    lines.push('    this.modules = {');
    for (const name of moduleNames) {
      lines.push(`      ${name},`);
    }
    lines.push('    };');
    lines.push('    this.initialized = false;');
    lines.push('  }');
    lines.push('');

    lines.push('  async initialize() {');
    lines.push('    for (const [name, module] of Object.entries(this.modules)) {');
    lines.push('      const manager = new module.Manager(this.config);');
    lines.push('      manager.initialize();');
    lines.push('    }');
    lines.push('    this.initialized = true;');
    lines.push('    return this;');
    lines.push('  }');
    lines.push('');

    lines.push('  async shutdown() {');
    lines.push('    this.initialized = false;');
    lines.push('  }');
    lines.push('}');
    lines.push('');

    lines.push('const app = new Application();');
    lines.push('app.initialize().then(() => console.log("Application ready"));');

    return {
      id: 3,
      name: '十万行单文件生成的超大规模AST',
      description: 'A programmatically generated large JavaScript file with thousands of function declarations, nested structures, classes, and IIFEs to simulate a massive AST for stress testing visualization.',
      language: 'javascript',
      sourceCode: lines.join('\n'),
      tags: ['large-scale', 'stress-test', 'generated', 'many-nodes'],
    };
  }

  private createSyntaxErrorScene(): PresetScene {
    const sourceCode = `// This file contains intentional syntax errors for testing error recovery
const validVar = 42;

function validFunction(x, y) {
  return x + y;
}

// Error 1: Missing closing bracket
const brokenArray = [1, 2, 3, 
  { name: "test", value: 100
;

// Valid code after error
const anotherValid = "hello world";

// Error 2: Invalid token
const 123invalid = "bad variable name";

// Valid code
if (true) {
  console.log("this is valid");
}

// Error 3: Missing closing parenthesis in function call
console.log("missing closing paren"

// Valid code continuing
const arrow = (x) => x * 2;

// Error 4: Unclosed string literal
const badString = "this string never ends

// Error 5: Missing closing brace for class
class BrokenClass {
  constructor() {
    this.value = 10;
  
  method() {
    return this.value;

// Valid code after broken class
function recoverAfterError() {
  return "recovered";
}

// Error 6: Invalid JSX (unclosed tag)
const jsx = (
  <div className="container">
    <span>Hello
  </div>
);

// Valid arrow function
const sum = (a, b) => a + b;

// Error 7: Double else
if (x > 0) {
  return 1;
} else {
  return 0;
} else {
  return -1;
}

// Valid export
export { validFunction, anotherValid, arrow, recoverAfterError, sum };

// Error 8: Missing catch/finally after try
try {
  doSomething();
}

// Valid final statement
const finalStatement = true;`;

    return {
      id: 4,
      name: '语法错误导致的局部解析中断与错误恢复树',
      description: 'JavaScript code with intentional syntax errors at various points (missing brackets, invalid tokens, unclosed strings, broken class definitions) to test parser error recovery and partial AST generation.',
      language: 'javascript',
      sourceCode,
      tags: ['syntax-error', 'error-recovery', 'partial-ast', 'resilient-parsing'],
    };
  }
}
