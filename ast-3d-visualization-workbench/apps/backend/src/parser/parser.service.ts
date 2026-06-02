import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ASTNode, ParseResult, IncrementalParseRequest } from './parser.interfaces';

interface TreeSitterParser {
  init(): Promise<void>;
  Language: {
    load(path: string): Promise<TreeSitterLanguage>;
  };
}

interface TreeSitterLanguage {
  nodeTypeCount: number;
}

interface TreeSitterTree {
  rootNode: TreeSitterNode;
  edit(edit: { startIndex: number; oldEndIndex: number; newEndIndex: number }): void;
  delete(): void;
}

interface TreeSitterNode {
  type: string;
  text: string;
  startIndex: number;
  endIndex: number;
  childCount: number;
  hasError: boolean;
  children: TreeSitterNode[];
  childForFieldName(name: string): TreeSitterNode | null;
}

interface TreeSitterParserInstance {
  parse(input: string, oldTree?: TreeSitterTree): TreeSitterTree;
  setLanguage(language: TreeSitterLanguage): void;
  delete(): void;
}

@Injectable()
export class ParserService implements OnModuleInit {
  private readonly logger = new Logger(ParserService.name);
  private treeSitterAvailable = false;
  private jsParser: TreeSitterParserInstance | null = null;
  private tsParser: TreeSitterParserInstance | null = null;
  private ParserModule: TreeSitterParser | null = null;

  async onModuleInit() {
    try {
      const parserModule: TreeSitterParser = require('web-tree-sitter');
      this.ParserModule = parserModule;
      await parserModule.init();
      this.logger.log('web-tree-sitter WASM initialized successfully');

      const grammarPaths = [
        'node_modules/web-tree-sitter/tree-sitter-javascript.wasm',
        'node_modules/tree-sitter-javascript/tree-sitter-javascript.wasm',
        'tree-sitter-javascript.wasm',
      ];

      const tsGrammarPaths = [
        'node_modules/web-tree-sitter/tree-sitter-typescript.wasm',
        'node_modules/tree-sitter-typescript/tree-sitter-typescript.wasm',
        'tree-sitter-typescript.wasm',
      ];

      let jsLang: TreeSitterLanguage | null = null;
      for (const grammarPath of grammarPaths) {
        try {
          jsLang = await parserModule.Language.load(grammarPath);
          this.logger.log(`JavaScript grammar loaded from: ${grammarPath}`);
          break;
        } catch {
          continue;
        }
      }

      let tsLang: TreeSitterLanguage | null = null;
      for (const grammarPath of tsGrammarPaths) {
        try {
          tsLang = await parserModule.Language.load(grammarPath);
          this.logger.log(`TypeScript grammar loaded from: ${grammarPath}`);
          break;
        } catch {
          continue;
        }
      }

      if (jsLang) {
        this.jsParser = new (this.ParserModule as any)() as TreeSitterParserInstance;
        this.jsParser.setLanguage(jsLang);
        this.treeSitterAvailable = true;
      }

      if (tsLang) {
        this.tsParser = new (this.ParserModule as any)() as TreeSitterParserInstance;
        this.tsParser.setLanguage(tsLang);
        this.treeSitterAvailable = true;
      }

      if (!this.treeSitterAvailable) {
        this.logger.warn('No tree-sitter grammars found. Falling back to custom recursive descent parser.');
      }
    } catch (error) {
      this.logger.warn(`web-tree-sitter initialization failed: ${error.message}. Using fallback parser.`);
      this.treeSitterAvailable = false;
    }
  }

  async parse(source: string, language: string): Promise<ParseResult> {
    const startTime = Date.now();

    if (this.treeSitterAvailable) {
      const parser = language === 'typescript' ? this.tsParser : this.jsParser;
      if (parser) {
        try {
          const tree = parser.parse(source);
          const ast = this.convertTreeSitterNode(tree.rootNode);
          tree.delete();
          let errorCount = 0;
          this.countErrors(ast, (c) => { errorCount += c; });
          return {
            ast,
            language,
            nodeCount: this.countNodes(ast),
            errorCount,
            parseTime: Date.now() - startTime,
            hasErrors: errorCount > 0,
          };
        } catch (error) {
          this.logger.warn(`Tree-sitter parse error: ${error.message}. Falling back to custom parser.`);
        }
      }
    }

    return this.fallbackParse(source, language, startTime);
  }

  async parseIncremental(request: IncrementalParseRequest): Promise<ParseResult> {
    const { source, language, previousSource, editStartIndex, editOldEndIndex, editNewEndIndex } = request;

    if (this.treeSitterAvailable && previousSource && editStartIndex !== undefined && editOldEndIndex !== undefined && editNewEndIndex !== undefined) {
      const parser = language === 'typescript' ? this.tsParser : this.jsParser;
      if (parser) {
        try {
          const oldTree = parser.parse(previousSource);
          oldTree.edit({
            startIndex: editStartIndex,
            oldEndIndex: editOldEndIndex,
            newEndIndex: editNewEndIndex,
          });
          const newTree = parser.parse(source, oldTree);
          oldTree.delete();
          const ast = this.convertTreeSitterNode(newTree.rootNode);
          newTree.delete();
          let errorCount = 0;
          this.countErrors(ast, (c) => { errorCount += c; });
          return {
            ast,
            language,
            nodeCount: this.countNodes(ast),
            errorCount,
            parseTime: Date.now(),
            hasErrors: errorCount > 0,
          };
        } catch (error) {
          this.logger.warn(`Incremental parse error: ${error.message}. Falling back to full parse.`);
        }
      }
    }

    return this.parse(source, language);
  }

  private convertTreeSitterNode(node: TreeSitterNode): ASTNode {
    const children: ASTNode[] = [];
    for (let i = 0; i < node.childCount; i++) {
      children.push(this.convertTreeSitterNode(node.children[i]));
    }

    return {
      id: uuidv4(),
      type: node.type,
      text: node.text.length > 200 ? node.text.substring(0, 200) + '...' : node.text,
      startIndex: node.startIndex,
      endIndex: node.endIndex,
      children,
      hasError: node.hasError,
      isErrorPlaceholder: node.type === 'ERROR',
    };
  }

  private countNodes(node: ASTNode): number {
    let count = 1;
    for (const child of node.children) {
      count += this.countNodes(child);
    }
    return count;
  }

  private countErrors(node: ASTNode, callback: (count: number) => void): void {
    if (node.hasError || node.isErrorPlaceholder) callback(1);
    for (const child of node.children) {
      this.countErrors(child, callback);
    }
  }

  private fallbackParse(source: string, language: string, startTime?: number): ParseResult {
    const start = startTime || Date.now();
    const tokenizer = new Tokenizer(source);
    const tokens = tokenizer.tokenize();
    const parser = new RecursiveDescentParser(tokens, source);
    const ast = parser.parse();
    const parseTime = Date.now() - start;

    return {
      ast,
      language,
      nodeCount: this.countNodes(ast),
      errorCount: parser.errorCount,
      parseTime,
      hasErrors: parser.errorCount > 0,
      errorMessage: parser.errorCount > 0 ? `${parser.errorCount} error(s) encountered during parsing` : undefined,
    };
  }
}

enum TokenType {
  Identifier,
  Number,
  String,
  TemplateString,
  Punctuator,
  Keyword,
  Operator,
  EOF,
  Unknown,
}

interface Token {
  type: TokenType;
  value: string;
  startIndex: number;
  endIndex: number;
}

const KEYWORDS = new Set([
  'function', 'return', 'var', 'let', 'const', 'if', 'else', 'for', 'while',
  'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally',
  'throw', 'new', 'class', 'extends', 'import', 'export', 'from', 'default',
  'typeof', 'instanceof', 'in', 'of', 'async', 'await', 'yield', 'super',
  'this', 'null', 'undefined', 'true', 'false', 'void', 'delete', 'with',
  'debugger', 'static', 'get', 'set', 'constructor',
]);

const OPERATORS = new Set([
  '=', '==', '===', '!=', '!==', '<', '>', '<=', '>=',
  '+', '-', '*', '/', '%', '**', '++', '--',
  '&&', '||', '??', '?.', '&', '|', '^', '~', '<<', '>>', '>>>',
  '+=', '-=', '*=', '/=', '%=', '**=', '&=', '|=', '^=',
  '<<=', '>>=', '>>>=', '&&=', '||=', '??=', '=>', '...',
]);

class Tokenizer {
  private source: string;
  private pos = 0;

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.pos < this.source.length) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.source.length) break;

      const startIndex = this.pos;
      const ch = this.source[this.pos];

      if (this.isIdentifierStart(ch)) {
        const value = this.readIdentifier();
        const type = KEYWORDS.has(value) ? TokenType.Keyword : TokenType.Identifier;
        tokens.push({ type, value, startIndex, endIndex: this.pos });
      } else if (this.isDigit(ch)) {
        const value = this.readNumber();
        tokens.push({ type: TokenType.Number, value, startIndex, endIndex: this.pos });
      } else if (ch === '"' || ch === "'") {
        const value = this.readString();
        tokens.push({ type: TokenType.String, value, startIndex, endIndex: this.pos });
      } else if (ch === '`') {
        const value = this.readTemplateString();
        tokens.push({ type: TokenType.TemplateString, value, startIndex, endIndex: this.pos });
      } else if (this.isOperatorStart(ch)) {
        const value = this.readOperator();
        tokens.push({ type: TokenType.Operator, value, startIndex, endIndex: this.pos });
      } else if (this.isPunctuator(ch)) {
        tokens.push({ type: TokenType.Punctuator, value: ch, startIndex, endIndex: this.pos + 1 });
        this.pos++;
      } else {
        tokens.push({ type: TokenType.Unknown, value: ch, startIndex, endIndex: this.pos + 1 });
        this.pos++;
      }
    }

    tokens.push({ type: TokenType.EOF, value: '', startIndex: this.pos, endIndex: this.pos });
    return tokens;
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.source.length) {
      const ch = this.source[this.pos];
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        this.pos++;
      } else if (ch === '/' && this.pos + 1 < this.source.length) {
        if (this.source[this.pos + 1] === '/') {
          this.pos += 2;
          while (this.pos < this.source.length && this.source[this.pos] !== '\n') this.pos++;
        } else if (this.source[this.pos + 1] === '*') {
          this.pos += 2;
          while (this.pos < this.source.length - 1 && !(this.source[this.pos] === '*' && this.source[this.pos + 1] === '/')) this.pos++;
          this.pos += 2;
        } else {
          break;
        }
      } else {
        break;
      }
    }
  }

  private isIdentifierStart(ch: string): boolean {
    return /[a-zA-Z_$]/.test(ch);
  }

  private isIdentifierPart(ch: string): boolean {
    return /[a-zA-Z0-9_$]/.test(ch);
  }

  private isDigit(ch: string): boolean {
    return /[0-9]/.test(ch);
  }

  private readIdentifier(): string {
    const start = this.pos;
    while (this.pos < this.source.length && this.isIdentifierPart(this.source[this.pos])) this.pos++;
    return this.source.substring(start, this.pos);
  }

  private readNumber(): string {
    const start = this.pos;
    if (this.source[this.pos] === '0' && this.pos + 1 < this.source.length && (this.source[this.pos + 1] === 'x' || this.source[this.pos + 1] === 'X')) {
      this.pos += 2;
      while (this.pos < this.source.length && /[0-9a-fA-F]/.test(this.source[this.pos])) this.pos++;
      return this.source.substring(start, this.pos);
    }
    while (this.pos < this.source.length && /[0-9]/.test(this.source[this.pos])) this.pos++;
    if (this.pos < this.source.length && this.source[this.pos] === '.') {
      this.pos++;
      while (this.pos < this.source.length && /[0-9]/.test(this.source[this.pos])) this.pos++;
    }
    if (this.pos < this.source.length && (this.source[this.pos] === 'e' || this.source[this.pos] === 'E')) {
      this.pos++;
      if (this.pos < this.source.length && (this.source[this.pos] === '+' || this.source[this.pos] === '-')) this.pos++;
      while (this.pos < this.source.length && /[0-9]/.test(this.source[this.pos])) this.pos++;
    }
    return this.source.substring(start, this.pos);
  }

  private readString(): string {
    const quote = this.source[this.pos];
    const start = this.pos;
    this.pos++;
    while (this.pos < this.source.length && this.source[this.pos] !== quote) {
      if (this.source[this.pos] === '\\') this.pos++;
      this.pos++;
    }
    if (this.pos < this.source.length) this.pos++;
    return this.source.substring(start, this.pos);
  }

  private readTemplateString(): string {
    const start = this.pos;
    this.pos++;
    while (this.pos < this.source.length) {
      if (this.source[this.pos] === '`') {
        this.pos++;
        break;
      }
      if (this.source[this.pos] === '\\') this.pos++;
      if (this.source[this.pos] === '$' && this.pos + 1 < this.source.length && this.source[this.pos + 1] === '{') {
        this.pos += 2;
        let depth = 1;
        while (this.pos < this.source.length && depth > 0) {
          if (this.source[this.pos] === '{') depth++;
          else if (this.source[this.pos] === '}') depth--;
          if (depth > 0) this.pos++;
        }
        if (this.pos < this.source.length) this.pos++;
      } else {
        this.pos++;
      }
    }
    return this.source.substring(start, this.pos);
  }

  private isOperatorStart(ch: string): boolean {
    return '=!<>+-*/%&|^~?.'.includes(ch);
  }

  private readOperator(): string {
    const start = this.pos;
    let maxLen = 0;
    let bestMatch = '';
    for (let len = 4; len >= 1; len--) {
      const candidate = this.source.substring(this.pos, this.pos + len);
      if (OPERATORS.has(candidate)) {
        maxLen = len;
        bestMatch = candidate;
        break;
      }
    }
    if (maxLen > 0) {
      this.pos += maxLen;
      return bestMatch;
    }
    this.pos++;
    return this.source.substring(start, this.pos);
  }

  private isPunctuator(ch: string): boolean {
    return '(){}[];:,@'.includes(ch);
  }
}

class RecursiveDescentParser {
  private tokens: Token[];
  private source: string;
  private pos = 0;
  private recursionDepth = 0;
  private readonly MAX_RECURSION_DEPTH = 5000;
  public errorCount = 0;

  constructor(tokens: Token[], source: string) {
    this.tokens = tokens;
    this.source = source;
  }

  parse(): ASTNode {
    const children: ASTNode[] = [];
    while (!this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) children.push(stmt);
    }
    return {
      id: uuidv4(),
      type: 'program',
      text: this.source.substring(0, Math.min(200, this.source.length)),
      startIndex: 0,
      endIndex: this.source.length,
      children,
    };
  }

  private parseStatement(): ASTNode {
    if (this.isAtEnd()) return this.createErrorNode('Unexpected end of input');
    this.recursionDepth++;
    if (this.recursionDepth > this.MAX_RECURSION_DEPTH) {
      this.errorCount++;
      this.recursionDepth--;
      return this.createErrorNode('Stack overflow: max recursion depth exceeded');
    }

    try {
      const token = this.peek();
      let node: ASTNode | null = null;

      if (token.type === TokenType.Keyword) {
        switch (token.value) {
          case 'function': node = this.parseFunctionDeclaration(); break;
          case 'var':
          case 'let':
          case 'const': node = this.parseVariableDeclaration(); break;
          case 'if': node = this.parseIfStatement(); break;
          case 'for': node = this.parseForStatement(); break;
          case 'while': node = this.parseWhileStatement(); break;
          case 'do': node = this.parseDoWhileStatement(); break;
          case 'try': node = this.parseTryCatch(); break;
          case 'class': node = this.parseClassDeclaration(); break;
          case 'return': node = this.parseReturnStatement(); break;
          case 'throw': node = this.parseThrowStatement(); break;
          case 'switch': node = this.parseSwitchStatement(); break;
          case 'import': node = this.parseImportDeclaration(); break;
          case 'export': node = this.parseExportDeclaration(); break;
          default: node = this.parseExpressionStatement(); break;
        }
      } else if (token.type === TokenType.Punctuator && token.value === '{') {
        node = this.parseBlockStatement();
      } else if (token.type === TokenType.Punctuator && token.value === ';') {
        this.advance();
        node = this.createNode('empty_statement', ';');
      } else {
        node = this.parseExpressionStatement();
      }

      if (node === null) {
        this.errorCount++;
        const errorToken = this.advance();
        node = this.createErrorNode(`Unexpected token: ${errorToken.value}`);
      }

      return node;
    } finally {
      this.recursionDepth--;
    }
  }

  private parseFunctionDeclaration(): ASTNode {
    const start = this.peek().startIndex;
    this.expectKeyword('function');
    const isAsync = this.peek().value === 'async';
    if (isAsync) this.advance();

    const name = this.peek().type === TokenType.Identifier ? this.advance().value : '<anonymous>';
    const params = this.parseParams();
    const body = this.parseBlockStatement();

    return {
      id: uuidv4(),
      type: 'function_declaration',
      text: `function ${name}`,
      startIndex: start,
      endIndex: body.endIndex,
      children: [
        this.createNode('identifier', name),
        params,
        body,
      ],
    };
  }

  private parseArrowFunction(): ASTNode {
    const start = this.peek().startIndex;
    const params = this.parseParams();

    if (this.peek().value !== '=>') {
      return params;
    }
    this.advance();

    let body: ASTNode;
    if (this.peek().value === '{') {
      body = this.parseBlockStatement();
    } else {
      const expr = this.parseAssignmentExpression();
      body = {
        id: uuidv4(),
        type: 'arrow_function_body',
        text: '=> ...',
        startIndex: start,
        endIndex: expr.endIndex,
        children: [expr],
      };
    }

    return {
      id: uuidv4(),
      type: 'arrow_function',
      text: '=> ...',
      startIndex: start,
      endIndex: body.endIndex,
      children: [params, body],
    };
  }

  private parseParams(): ASTNode {
    const start = this.peek().startIndex;
    if (!this.expectPunctuator('(')) {
      return this.createErrorNode('Expected ( for parameters');
    }

    const children: ASTNode[] = [];
    while (!this.isAtEnd() && this.peek().value !== ')') {
      if (this.peek().type === TokenType.Identifier) {
        children.push(this.createNode('parameter', this.advance().value));
      } else if (this.peek().value === '...') {
        this.advance();
        if (this.peek().type === TokenType.Identifier) {
          children.push(this.createNode('rest_parameter', this.advance().value));
        }
      } else if (this.peek().value === '{') {
        children.push(this.parseObjectPattern());
      } else if (this.peek().value === '[') {
        children.push(this.parseArrayPattern());
      } else {
        this.advance();
      }
      if (this.peek().value === ',') this.advance();
    }
    this.expectPunctuator(')');

    return {
      id: uuidv4(),
      type: 'formal_parameters',
      text: '(...)',
      startIndex: start,
      endIndex: this.peek().endIndex,
      children,
    };
  }

  private parseObjectPattern(): ASTNode {
    const start = this.peek().startIndex;
    this.expectPunctuator('{');
    const children: ASTNode[] = [];
    while (!this.isAtEnd() && this.peek().value !== '}') {
      if (this.peek().type === TokenType.Identifier) {
        children.push(this.createNode('object_pattern_property', this.advance().value));
      } else {
        this.advance();
      }
      if (this.peek().value === ',') this.advance();
    }
    this.expectPunctuator('}');
    return {
      id: uuidv4(),
      type: 'object_pattern',
      text: '{...}',
      startIndex: start,
      endIndex: this.peek().endIndex,
      children,
    };
  }

  private parseArrayPattern(): ASTNode {
    const start = this.peek().startIndex;
    this.expectPunctuator('[');
    const children: ASTNode[] = [];
    while (!this.isAtEnd() && this.peek().value !== ']') {
      if (this.peek().type === TokenType.Identifier) {
        children.push(this.createNode('array_pattern_element', this.advance().value));
      } else {
        this.advance();
      }
      if (this.peek().value === ',') this.advance();
    }
    this.expectPunctuator(']');
    return {
      id: uuidv4(),
      type: 'array_pattern',
      text: '[...]',
      startIndex: start,
      endIndex: this.peek().endIndex,
      children,
    };
  }

  private parseVariableDeclaration(): ASTNode {
    const start = this.peek().startIndex;
    const kind = this.advance().value;
    const children: ASTNode[] = [];

    do {
      const declarator = this.parseVariableDeclarator();
      children.push(declarator);
      if (this.peek().value === ',') this.advance();
      else break;
    } while (!this.isAtEnd());

    this.consumeSemicolon();

    return {
      id: uuidv4(),
      type: 'variable_declaration',
      text: `${kind} ...`,
      startIndex: start,
      endIndex: this.peek().endIndex,
      children,
    };
  }

  private parseVariableDeclarator(): ASTNode {
    const start = this.peek().startIndex;
    let name: string;

    if (this.peek().value === '{') {
      const pattern = this.parseObjectPattern();
      name = '{...}';
      if (this.peek().value === '=') {
        this.advance();
        const init = this.parseAssignmentExpression();
        return {
          id: uuidv4(),
          type: 'variable_declarator',
          text: '{...} = ...',
          startIndex: start,
          endIndex: init.endIndex,
          children: [pattern, init],
        };
      }
      return {
        id: uuidv4(),
        type: 'variable_declarator',
        text: '{...}',
        startIndex: start,
        endIndex: pattern.endIndex,
        children: [pattern],
      };
    }

    if (this.peek().value === '[') {
      const pattern = this.parseArrayPattern();
      if (this.peek().value === '=') {
        this.advance();
        const init = this.parseAssignmentExpression();
        return {
          id: uuidv4(),
          type: 'variable_declarator',
          text: '[...] = ...',
          startIndex: start,
          endIndex: init.endIndex,
          children: [pattern, init],
        };
      }
      return {
        id: uuidv4(),
        type: 'variable_declarator',
        text: '[...]',
        startIndex: start,
        endIndex: pattern.endIndex,
        children: [pattern],
      };
    }

    name = this.peek().type === TokenType.Identifier ? this.advance().value : '<unknown>';
    const nameNode = this.createNode('identifier', name);

    if (this.peek().value === '=') {
      this.advance();
      const init = this.parseAssignmentExpression();
      return {
        id: uuidv4(),
        type: 'variable_declarator',
        text: `${name} = ...`,
        startIndex: start,
        endIndex: init.endIndex,
        children: [nameNode, init],
      };
    }

    return {
      id: uuidv4(),
      type: 'variable_declarator',
      text: name,
      startIndex: start,
      endIndex: nameNode.endIndex,
      children: [nameNode],
    };
  }

  private parseIfStatement(): ASTNode {
    const start = this.peek().startIndex;
    this.expectKeyword('if');
    this.expectPunctuator('(');
    const condition = this.parseExpression();
    this.expectPunctuator(')');
    const consequent = this.parseStatement();

    const children: ASTNode[] = [condition, consequent];

    let alternate: ASTNode | null = null;
    if (this.peek().value === 'else') {
      this.advance();
      alternate = this.parseStatement();
      children.push(alternate);
    }

    return {
      id: uuidv4(),
      type: 'if_statement',
      text: alternate ? 'if ... else' : 'if ...',
      startIndex: start,
      endIndex: (alternate || consequent).endIndex,
      children,
    };
  }

  private parseForStatement(): ASTNode {
    const start = this.peek().startIndex;
    this.expectKeyword('for');
    this.expectPunctuator('(');

    const children: ASTNode[] = [];

    if (this.peek().value === 'const' || this.peek().value === 'let' || this.peek().value === 'var') {
      children.push(this.parseVariableDeclaration());
    } else if (this.peek().value !== ';') {
      children.push(this.parseExpression());
      this.consumeSemicolon();
    } else {
      this.advance();
    }

    if (this.peek().value !== ';') {
      children.push(this.parseExpression());
    }
    this.consumeSemicolon();

    if (this.peek().value !== ')') {
      children.push(this.parseExpression());
    }
    this.expectPunctuator(')');

    children.push(this.parseStatement());

    return {
      id: uuidv4(),
      type: 'for_statement',
      text: 'for (...)',
      startIndex: start,
      endIndex: children[children.length - 1].endIndex,
      children,
    };
  }

  private parseWhileStatement(): ASTNode {
    const start = this.peek().startIndex;
    this.expectKeyword('while');
    this.expectPunctuator('(');
    const condition = this.parseExpression();
    this.expectPunctuator(')');
    const body = this.parseStatement();
    return {
      id: uuidv4(),
      type: 'while_statement',
      text: 'while (...)',
      startIndex: start,
      endIndex: body.endIndex,
      children: [condition, body],
    };
  }

  private parseDoWhileStatement(): ASTNode {
    const start = this.peek().startIndex;
    this.expectKeyword('do');
    const body = this.parseStatement();
    this.expectKeyword('while');
    this.expectPunctuator('(');
    const condition = this.parseExpression();
    this.expectPunctuator(')');
    this.consumeSemicolon();
    return {
      id: uuidv4(),
      type: 'do_while_statement',
      text: 'do ... while (...)',
      startIndex: start,
      endIndex: condition.endIndex,
      children: [body, condition],
    };
  }

  private parseTryCatch(): ASTNode {
    const start = this.peek().startIndex;
    this.expectKeyword('try');
    const tryBlock = this.parseBlockStatement();
    const children: ASTNode[] = [tryBlock];

    if (this.peek().value === 'catch') {
      this.advance();
      let catchParam: ASTNode | null = null;
      if (this.peek().value === '(') {
        this.advance();
        if (this.peek().type === TokenType.Identifier) {
          catchParam = this.createNode('catch_parameter', this.advance().value);
        }
        this.expectPunctuator(')');
      }
      const catchBlock = this.parseBlockStatement();
      const catchChildren = catchParam ? [catchParam, catchBlock] : [catchBlock];
      children.push({
        id: uuidv4(),
        type: 'catch_clause',
        text: 'catch',
        startIndex: catchBlock.startIndex - 10,
        endIndex: catchBlock.endIndex,
        children: catchChildren,
      });
    }

    if (this.peek().value === 'finally') {
      this.advance();
      const finallyBlock = this.parseBlockStatement();
      children.push({
        id: uuidv4(),
        type: 'finally_clause',
        text: 'finally',
        startIndex: finallyBlock.startIndex - 10,
        endIndex: finallyBlock.endIndex,
        children: [finallyBlock],
      });
    }

    return {
      id: uuidv4(),
      type: 'try_statement',
      text: 'try ...',
      startIndex: start,
      endIndex: children[children.length - 1].endIndex,
      children,
    };
  }

  private parseClassDeclaration(): ASTNode {
    const start = this.peek().startIndex;
    this.expectKeyword('class');
    const name = this.peek().type === TokenType.Identifier ? this.advance().value : '<anonymous>';
    const nameNode = this.createNode('identifier', name);
    const children: ASTNode[] = [nameNode];

    if (this.peek().value === 'extends') {
      this.advance();
      const superClass = this.parseExpression();
      children.push({
        id: uuidv4(),
        type: 'class_heritage',
        text: 'extends ...',
        startIndex: superClass.startIndex,
        endIndex: superClass.endIndex,
        children: [superClass],
      });
    }

    this.expectPunctuator('{');
    const bodyChildren: ASTNode[] = [];
    while (!this.isAtEnd() && this.peek().value !== '}') {
      if (this.peek().value === 'static') this.advance();
      if (this.peek().value === 'get' || this.peek().value === 'set') this.advance();
      if (this.peek().value === 'constructor' || this.peek().type === TokenType.Identifier) {
        const methodName = this.advance().value;
        if (this.peek().value === '(') {
          const params = this.parseParams();
          const methodBody = this.parseBlockStatement();
          bodyChildren.push({
            id: uuidv4(),
            type: 'method_definition',
            text: methodName,
            startIndex: params.startIndex - methodName.length,
            endIndex: methodBody.endIndex,
            children: [this.createNode('property_identifier', methodName), params, methodBody],
          });
        } else {
          bodyChildren.push(this.createNode('class_property', methodName));
        }
      } else {
        this.advance();
      }
    }
    this.expectPunctuator('}');

    const classBody = {
      id: uuidv4(),
      type: 'class_body',
      text: '{ ... }',
      startIndex: start,
      endIndex: this.peek().endIndex,
      children: bodyChildren,
    };
    children.push(classBody);

    return {
      id: uuidv4(),
      type: 'class_declaration',
      text: `class ${name}`,
      startIndex: start,
      endIndex: this.peek().endIndex,
      children,
    };
  }

  private parseReturnStatement(): ASTNode {
    const start = this.peek().startIndex;
    this.expectKeyword('return');
    if (this.peek().value === ';' || this.peek().value === '}' || this.isAtEnd()) {
      this.consumeSemicolon();
      return {
        id: uuidv4(),
        type: 'return_statement',
        text: 'return',
        startIndex: start,
        endIndex: this.peek().endIndex,
        children: [],
      };
    }
    const value = this.parseExpression();
    this.consumeSemicolon();
    return {
      id: uuidv4(),
      type: 'return_statement',
      text: 'return ...',
      startIndex: start,
      endIndex: value.endIndex,
      children: [value],
    };
  }

  private parseThrowStatement(): ASTNode {
    const start = this.peek().startIndex;
    this.expectKeyword('throw');
    const value = this.parseExpression();
    this.consumeSemicolon();
    return {
      id: uuidv4(),
      type: 'throw_statement',
      text: 'throw ...',
      startIndex: start,
      endIndex: value.endIndex,
      children: [value],
    };
  }

  private parseSwitchStatement(): ASTNode {
    const start = this.peek().startIndex;
    this.expectKeyword('switch');
    this.expectPunctuator('(');
    const discriminant = this.parseExpression();
    this.expectPunctuator(')');
    this.expectPunctuator('{');
    const children: ASTNode[] = [discriminant];
    while (!this.isAtEnd() && this.peek().value !== '}') {
      if (this.peek().value === 'case') {
        this.advance();
        const test = this.parseExpression();
        this.expectPunctuator(':');
        const consequent: ASTNode[] = [test];
        while (!this.isAtEnd() && this.peek().value !== 'case' && this.peek().value !== 'default' && this.peek().value !== '}') {
          const stmt = this.parseStatement();
          if (stmt) consequent.push(stmt);
        }
        children.push({
          id: uuidv4(),
          type: 'switch_case',
          text: 'case ...',
          startIndex: test.startIndex,
          endIndex: consequent[consequent.length - 1]?.endIndex || test.endIndex,
          children: consequent,
        });
      } else if (this.peek().value === 'default') {
        this.advance();
        this.expectPunctuator(':');
        const consequent: ASTNode[] = [];
        while (!this.isAtEnd() && this.peek().value !== 'case' && this.peek().value !== '}') {
          const stmt = this.parseStatement();
          if (stmt) consequent.push(stmt);
        }
        children.push({
          id: uuidv4(),
          type: 'switch_default',
          text: 'default',
          startIndex: start,
          endIndex: consequent[consequent.length - 1]?.endIndex || this.peek().endIndex,
          children: consequent,
        });
      } else {
        this.advance();
      }
    }
    this.expectPunctuator('}');
    return {
      id: uuidv4(),
      type: 'switch_statement',
      text: 'switch (...)',
      startIndex: start,
      endIndex: this.peek().endIndex,
      children,
    };
  }

  private parseImportDeclaration(): ASTNode {
    const start = this.peek().startIndex;
    this.expectKeyword('import');
    const children: ASTNode[] = [];

    if (this.peek().value === '{') {
      this.advance();
      while (!this.isAtEnd() && this.peek().value !== '}') {
        if (this.peek().type === TokenType.Identifier) {
          children.push(this.createNode('import_specifier', this.advance().value));
        } else {
          this.advance();
        }
        if (this.peek().value === ',') this.advance();
      }
      this.expectPunctuator('}');
      if (this.peek().value === 'from') this.advance();
    } else if (this.peek().type === TokenType.Identifier) {
      children.push(this.createNode('import_default', this.advance().value));
      if (this.peek().value === ',') this.advance();
      if (this.peek().value === '*') {
        this.advance();
        if (this.peek().value === 'as') this.advance();
        if (this.peek().type === TokenType.Identifier) {
          children.push(this.createNode('import_namespace', this.advance().value));
        }
      }
      if (this.peek().value === 'from') this.advance();
    } else if (this.peek().value === '*') {
      this.advance();
      if (this.peek().value === 'as') this.advance();
      if (this.peek().type === TokenType.Identifier) {
        children.push(this.createNode('import_namespace', this.advance().value));
      }
      if (this.peek().value === 'from') this.advance();
    }

    if (this.peek().type === TokenType.String) {
      children.push(this.createNode('string', this.advance().value));
    }

    this.consumeSemicolon();

    return {
      id: uuidv4(),
      type: 'import_declaration',
      text: 'import ...',
      startIndex: start,
      endIndex: this.peek().endIndex,
      children,
    };
  }

  private parseExportDeclaration(): ASTNode {
    const start = this.peek().startIndex;
    this.expectKeyword('export');
    const children: ASTNode[] = [];

    if (this.peek().value === 'default') {
      this.advance();
      const decl = this.parseStatement();
      if (decl) children.push(decl);
      return {
        id: uuidv4(),
        type: 'export_default_declaration',
        text: 'export default ...',
        startIndex: start,
        endIndex: children[0]?.endIndex || this.peek().endIndex,
        children,
      };
    }

    if (this.peek().value === '{') {
      this.advance();
      while (!this.isAtEnd() && this.peek().value !== '}') {
        if (this.peek().type === TokenType.Identifier) {
          children.push(this.createNode('export_specifier', this.advance().value));
        } else {
          this.advance();
        }
        if (this.peek().value === ',') this.advance();
      }
      this.expectPunctuator('}');
      if (this.peek().value === 'from') this.advance();
      if (this.peek().type === TokenType.String) {
        children.push(this.createNode('string', this.advance().value));
      }
      this.consumeSemicolon();
      return {
        id: uuidv4(),
        type: 'export_named_declaration',
        text: 'export { ... }',
        startIndex: start,
        endIndex: this.peek().endIndex,
        children,
      };
    }

    if (this.peek().value === '*') {
      this.advance();
      if (this.peek().value === 'as') this.advance();
      if (this.peek().type === TokenType.Identifier) this.advance();
      if (this.peek().value === 'from') this.advance();
      if (this.peek().type === TokenType.String) this.advance();
      this.consumeSemicolon();
      return {
        id: uuidv4(),
        type: 'export_all_declaration',
        text: 'export * ...',
        startIndex: start,
        endIndex: this.peek().endIndex,
        children,
      };
    }

    const decl = this.parseStatement();
    if (decl) children.push(decl);
    return {
      id: uuidv4(),
      type: 'export_declaration',
      text: 'export ...',
      startIndex: start,
      endIndex: children[0]?.endIndex || this.peek().endIndex,
      children,
    };
  }

  private parseBlockStatement(): ASTNode {
    const start = this.peek().startIndex;
    if (!this.expectPunctuator('{')) {
      return this.createErrorNode('Expected {');
    }
    const children: ASTNode[] = [];
    while (!this.isAtEnd() && this.peek().value !== '}') {
      const stmt = this.parseStatement();
      if (stmt) children.push(stmt);
    }
    this.expectPunctuator('}');
    return {
      id: uuidv4(),
      type: 'block_statement',
      text: '{ ... }',
      startIndex: start,
      endIndex: this.peek().endIndex,
      children,
    };
  }

  private parseExpressionStatement(): ASTNode {
    const start = this.peek().startIndex;
    const expr = this.parseExpression();
    this.consumeSemicolon();
    return {
      id: uuidv4(),
      type: 'expression_statement',
      text: expr.text.substring(0, 80),
      startIndex: start,
      endIndex: expr.endIndex,
      children: [expr],
    };
  }

  private parseExpression(): ASTNode {
    return this.parseAssignmentExpression();
  }

  private parseAssignmentExpression(): ASTNode {
    const left = this.parseConditionalExpression();
    const assignmentOps = ['=', '+=', '-=', '*=', '/=', '%=', '**=', '&=', '|=', '^=', '<<=', '>>=', '>>>=', '&&=', '||=', '??='];
    if (assignmentOps.includes(this.peek().value)) {
      const op = this.advance().value;
      const right = this.parseAssignmentExpression();
      return {
        id: uuidv4(),
        type: 'assignment_expression',
        text: op,
        startIndex: left.startIndex,
        endIndex: right.endIndex,
        children: [left, right],
      };
    }
    return left;
  }

  private parseConditionalExpression(): ASTNode {
    const test = this.parseBinaryExpression();
    if (this.peek().value === '?') {
      this.advance();
      const consequent = this.parseAssignmentExpression();
      this.expectPunctuator(':');
      const alternate = this.parseAssignmentExpression();
      return {
        id: uuidv4(),
        type: 'ternary_expression',
        text: '? :',
        startIndex: test.startIndex,
        endIndex: alternate.endIndex,
        children: [test, consequent, alternate],
      };
    }
    return test;
  }

  private parseBinaryExpression(): ASTNode {
    let left = this.parseUnaryExpression();
    const binaryOps = ['==', '===', '!=', '!==', '<', '>', '<=', '>=', '&&', '||', '??', '+', '-', '*', '/', '%', '**', '&', '|', '^', '<<', '>>', '>>>', 'in', 'instanceof'];
    while (!this.isAtEnd() && binaryOps.includes(this.peek().value)) {
      const op = this.advance().value;
      const right = this.parseUnaryExpression();
      left = {
        id: uuidv4(),
        type: 'binary_expression',
        text: op,
        startIndex: left.startIndex,
        endIndex: right.endIndex,
        children: [left, right],
      };
    }
    return left;
  }

  private parseUnaryExpression(): ASTNode {
    const unaryOps = ['!', '~', '-', '+', 'typeof', 'void', 'delete'];
    if (unaryOps.includes(this.peek().value)) {
      const op = this.advance().value;
      const argument = this.parseUnaryExpression();
      return {
        id: uuidv4(),
        type: 'unary_expression',
        text: op,
        startIndex: argument.startIndex - op.length,
        endIndex: argument.endIndex,
        children: [argument],
      };
    }
    if (this.peek().value === '++' || this.peek().value === '--') {
      const op = this.advance().value;
      const argument = this.parsePostfixExpression();
      return {
        id: uuidv4(),
        type: 'update_expression',
        text: `prefix ${op}`,
        startIndex: argument.startIndex - 2,
        endIndex: argument.endIndex,
        children: [argument],
      };
    }
    return this.parsePostfixExpression();
  }

  private parsePostfixExpression(): ASTNode {
    let expr = this.parseCallMemberExpression();
    if (this.peek().value === '++' || this.peek().value === '--') {
      const op = this.advance().value;
      return {
        id: uuidv4(),
        type: 'update_expression',
        text: `postfix ${op}`,
        startIndex: expr.startIndex,
        endIndex: this.peek().endIndex,
        children: [expr],
      };
    }
    return expr;
  }

  private parseCallMemberExpression(): ASTNode {
    let expr = this.parsePrimaryExpression();

    while (!this.isAtEnd()) {
      if (this.peek().value === '(') {
        const args = this.parseArguments();
        expr = {
          id: uuidv4(),
          type: 'call_expression',
          text: expr.text + '(...)',
          startIndex: expr.startIndex,
          endIndex: args.endIndex,
          children: [expr, args],
        };
      } else if (this.peek().value === '.') {
        this.advance();
        const property = this.peek().type === TokenType.Identifier ? this.advance().value : this.advance().value;
        const propNode = this.createNode('property_identifier', property);
        expr = {
          id: uuidv4(),
          type: 'member_expression',
          text: `.${property}`,
          startIndex: expr.startIndex,
          endIndex: propNode.endIndex,
          children: [expr, propNode],
        };
      } else if (this.peek().value === '[') {
        this.advance();
        const index = this.parseExpression();
        this.expectPunctuator(']');
        expr = {
          id: uuidv4(),
          type: 'computed_member_expression',
          text: '[...]',
          startIndex: expr.startIndex,
          endIndex: this.peek().endIndex,
          children: [expr, index],
        };
      } else if (this.peek().value === '?.') {
        this.advance();
        if (this.peek().value === '(') {
          const args = this.parseArguments();
          expr = {
            id: uuidv4(),
            type: 'optional_call_expression',
            text: '?.(...)',
            startIndex: expr.startIndex,
            endIndex: args.endIndex,
            children: [expr, args],
          };
        } else {
          const property = this.peek().type === TokenType.Identifier ? this.advance().value : this.advance().value;
          expr = {
            id: uuidv4(),
            type: 'optional_member_expression',
            text: `?.${property}`,
            startIndex: expr.startIndex,
            endIndex: this.peek().endIndex,
            children: [expr, this.createNode('property_identifier', property)],
          };
        }
      } else {
        break;
      }
    }

    return expr;
  }

  private parseArguments(): ASTNode {
    const start = this.peek().startIndex;
    this.expectPunctuator('(');
    const children: ASTNode[] = [];
    while (!this.isAtEnd() && this.peek().value !== ')') {
      if (this.peek().value === '...') {
        this.advance();
        const arg = this.parseAssignmentExpression();
        children.push({
          id: uuidv4(),
          type: 'spread_argument',
          text: '...arg',
          startIndex: arg.startIndex,
          endIndex: arg.endIndex,
          children: [arg],
        });
      } else {
        children.push(this.parseAssignmentExpression());
      }
      if (this.peek().value === ',') this.advance();
    }
    this.expectPunctuator(')');
    return {
      id: uuidv4(),
      type: 'arguments',
      text: '(...)',
      startIndex: start,
      endIndex: this.peek().endIndex,
      children,
    };
  }

  private parsePrimaryExpression(): ASTNode {
    const token = this.peek();

    if (token.type === TokenType.Keyword) {
      switch (token.value) {
        case 'function':
          return this.parseFunctionDeclaration();
        case 'this':
          this.advance();
          return this.createNode('this', 'this');
        case 'new': {
          this.advance();
          const callee = this.parseCallMemberExpression();
          return {
            id: uuidv4(),
            type: 'new_expression',
            text: `new ${callee.text}`,
            startIndex: callee.startIndex - 4,
            endIndex: callee.endIndex,
            children: [callee],
          };
        }
        case 'null':
          this.advance();
          return this.createNode('null', 'null');
        case 'undefined':
          this.advance();
          return this.createNode('undefined', 'undefined');
        case 'true':
        case 'false':
          this.advance();
          return this.createNode('boolean', token.value);
        case 'async': {
          this.advance();
          if (this.peek().value === 'function') {
            return this.parseFunctionDeclaration();
          }
          return this.createNode('identifier', 'async');
        }
        case 'class':
          return this.parseClassDeclaration();
        case 'typeof': {
          this.advance();
          const arg = this.parseUnaryExpression();
          return {
            id: uuidv4(),
            type: 'typeof_expression',
            text: 'typeof',
            startIndex: arg.startIndex - 6,
            endIndex: arg.endIndex,
            children: [arg],
          };
        }
        default:
          this.advance();
          return this.createNode('identifier', token.value);
      }
    }

    if (token.type === TokenType.Identifier) {
      this.advance();
      if (this.peek().value === '=>') {
        this.pos--;
        const idToken = this.peek();
        const start = idToken.startIndex;
        const paramNode = this.createNode('identifier', idToken.value);
        this.advance();
        this.advance();
        let body: ASTNode;
        if (this.peek().value === '{') {
          body = this.parseBlockStatement();
        } else {
          body = this.parseAssignmentExpression();
        }
        return {
          id: uuidv4(),
          type: 'arrow_function',
          text: `${idToken.value} => ...`,
          startIndex: start,
          endIndex: body.endIndex,
          children: [paramNode, body],
        };
      }
      return this.createNode('identifier', token.value);
    }

    if (token.type === TokenType.Number) {
      this.advance();
      return this.createNode('number', token.value);
    }

    if (token.type === TokenType.String) {
      this.advance();
      return this.createNode('string', token.value);
    }

    if (token.type === TokenType.TemplateString) {
      this.advance();
      return this.createNode('template_string', token.value);
    }

    if (token.value === '(') {
      this.advance();
      if (this.peek().value === ')') {
        this.advance();
        if (this.peek().value === '=>') {
          this.advance();
          let body: ASTNode;
          if (this.peek().value === '{') {
            body = this.parseBlockStatement();
          } else {
            body = this.parseAssignmentExpression();
          }
          return {
            id: uuidv4(),
            type: 'arrow_function',
            text: '() => ...',
            startIndex: token.startIndex,
            endIndex: body.endIndex,
            children: [body],
          };
        }
        return this.createNode('call_expression', '()');
      }

      const expr = this.parseExpression();
      if (this.peek().value === ',') {
        const children: ASTNode[] = [expr];
        while (this.peek().value === ',') {
          this.advance();
          children.push(this.parseAssignmentExpression());
        }
        this.expectPunctuator(')');
        if (this.peek().value === '=>') {
          this.advance();
          let body: ASTNode;
          if (this.peek().value === '{') {
            body = this.parseBlockStatement();
          } else {
            body = this.parseAssignmentExpression();
          }
          return {
            id: uuidv4(),
            type: 'arrow_function',
            text: '(...) => ...',
            startIndex: token.startIndex,
            endIndex: body.endIndex,
            children: [...children, body],
          };
        }
        return {
          id: uuidv4(),
          type: 'sequence_expression',
          text: '(...)',
          startIndex: token.startIndex,
          endIndex: this.peek().endIndex,
          children,
        };
      }

      this.expectPunctuator(')');
      if (this.peek().value === '=>') {
        this.advance();
        let body: ASTNode;
        if (this.peek().value === '{') {
          body = this.parseBlockStatement();
        } else {
          body = this.parseAssignmentExpression();
        }
        return {
          id: uuidv4(),
          type: 'arrow_function',
          text: '(x) => ...',
          startIndex: token.startIndex,
          endIndex: body.endIndex,
          children: [expr, body],
        };
      }

      return {
        id: uuidv4(),
        type: 'parenthesized_expression',
        text: '(...)',
        startIndex: token.startIndex,
        endIndex: this.peek().endIndex,
        children: [expr],
      };
    }

    if (token.value === '[') {
      return this.parseArrayExpression();
    }

    if (token.value === '{') {
      return this.parseObjectExpression();
    }

    if (token.value === '<') {
      return this.parseJsxElement();
    }

    this.advance();
    return this.createNode('unknown', token.value);
  }

  private parseArrayExpression(): ASTNode {
    const start = this.peek().startIndex;
    this.expectPunctuator('[');
    const children: ASTNode[] = [];
    while (!this.isAtEnd() && this.peek().value !== ']') {
      if (this.peek().value === '...') {
        this.advance();
        const element = this.parseAssignmentExpression();
        children.push({
          id: uuidv4(),
          type: 'spread_element',
          text: '...',
          startIndex: element.startIndex,
          endIndex: element.endIndex,
          children: [element],
        });
      } else {
        children.push(this.parseAssignmentExpression());
      }
      if (this.peek().value === ',') this.advance();
    }
    this.expectPunctuator(']');
    return {
      id: uuidv4(),
      type: 'array_expression',
      text: '[...]',
      startIndex: start,
      endIndex: this.peek().endIndex,
      children,
    };
  }

  private parseObjectExpression(): ASTNode {
    const start = this.peek().startIndex;
    this.expectPunctuator('{');
    const children: ASTNode[] = [];
    while (!this.isAtEnd() && this.peek().value !== '}') {
      if (this.peek().value === '...') {
        this.advance();
        const element = this.parseAssignmentExpression();
        children.push({
          id: uuidv4(),
          type: 'spread_element',
          text: '...',
          startIndex: element.startIndex,
          endIndex: element.endIndex,
          children: [element],
        });
      } else {
        children.push(this.parsePropertyDefinition());
      }
      if (this.peek().value === ',') this.advance();
    }
    this.expectPunctuator('}');
    return {
      id: uuidv4(),
      type: 'object_expression',
      text: '{...}',
      startIndex: start,
      endIndex: this.peek().endIndex,
      children,
    };
  }

  private parsePropertyDefinition(): ASTNode {
    const start = this.peek().startIndex;
    let key: ASTNode;

    if (this.peek().type === TokenType.String) {
      key = this.createNode('property_identifier', this.advance().value);
    } else if (this.peek().type === TokenType.Number) {
      key = this.createNode('property_identifier', this.advance().value);
    } else if (this.peek().value === '[') {
      this.advance();
      key = this.parseExpression();
      this.expectPunctuator(']');
    } else if (this.peek().type === TokenType.Identifier || this.peek().type === TokenType.Keyword) {
      key = this.createNode('property_identifier', this.advance().value);
    } else {
      key = this.createNode('property_identifier', this.advance().value);
    }

    if (this.peek().value === ':') {
      this.advance();
      const value = this.parseAssignmentExpression();
      return {
        id: uuidv4(),
        type: 'property_definition',
        text: key.text,
        startIndex: start,
        endIndex: value.endIndex,
        children: [key, value],
      };
    }

    if (this.peek().value === '(') {
      const params = this.parseParams();
      const body = this.parseBlockStatement();
      return {
        id: uuidv4(),
        type: 'method_definition',
        text: key.text,
        startIndex: start,
        endIndex: body.endIndex,
        children: [key, params, body],
      };
    }

    return {
      id: uuidv4(),
      type: 'shorthand_property_identifier',
      text: key.text,
      startIndex: start,
      endIndex: key.endIndex,
      children: [],
    };
  }

  private parseJsxElement(): ASTNode {
    const start = this.peek().startIndex;
    this.expectPunctuator('<');

    const nameToken = this.peek();
    const name = nameToken.type === TokenType.Identifier ? this.advance().value : this.advance().value;
    const nameNode = this.createNode('jsx_identifier', name);
    const children: ASTNode[] = [nameNode];
    const attributes: ASTNode[] = [];

    while (!this.isAtEnd() && this.peek().value !== '>' && this.peek().value !== '/') {
      if (this.peek().type === TokenType.Identifier) {
        const attrName = this.advance().value;
        const attrNameNode = this.createNode('jsx_identifier', attrName);
        if (this.peek().value === '=') {
          this.advance();
          let attrValue: ASTNode;
          if (this.peek().type === TokenType.String) {
            attrValue = this.createNode('string', this.advance().value);
          } else if (this.peek().value === '{') {
            this.advance();
            attrValue = this.parseExpression();
            this.expectPunctuator('}');
          } else {
            attrValue = this.createNode('jsx_expression', this.advance().value);
          }
          attributes.push({
            id: uuidv4(),
            type: 'jsx_attribute',
            text: attrName,
            startIndex: attrNameNode.startIndex,
            endIndex: attrValue.endIndex,
            children: [attrNameNode, attrValue],
          });
        } else {
          attributes.push({
            id: uuidv4(),
            type: 'jsx_attribute',
            text: attrName,
            startIndex: attrNameNode.startIndex,
            endIndex: attrNameNode.endIndex,
            children: [attrNameNode],
          });
        }
      } else if (this.peek().value === '{') {
        this.advance();
        const expr = this.parseExpression();
        this.expectPunctuator('}');
        attributes.push({
          id: uuidv4(),
          type: 'jsx_expression_attribute',
          text: '{...}',
          startIndex: expr.startIndex,
          endIndex: this.peek().endIndex,
          children: [expr],
        });
      } else {
        this.advance();
      }
    }

    if (attributes.length > 0) {
      children.push({
        id: uuidv4(),
        type: 'jsx_attributes',
        text: 'attributes',
        startIndex: attributes[0].startIndex,
        endIndex: attributes[attributes.length - 1].endIndex,
        children: attributes,
      });
    }

    if (this.peek().value === '/') {
      this.advance();
      this.expectPunctuator('>');
      return {
        id: uuidv4(),
        type: 'jsx_self_closing_element',
        text: `<${name} />`,
        startIndex: start,
        endIndex: this.peek().endIndex,
        children,
      };
    }

    this.expectPunctuator('>');

    const bodyChildren: ASTNode[] = [];
    while (!this.isAtEnd()) {
      if (this.peek().value === '<') {
        const nextPos = this.pos + 1;
        if (nextPos < this.tokens.length && this.tokens[nextPos].value === '/') {
          break;
        }
        bodyChildren.push(this.parseJsxElement());
      } else if (this.peek().value === '{') {
        this.advance();
        if (this.peek().value !== '}') {
          const expr = this.parseExpression();
          bodyChildren.push({
            id: uuidv4(),
            type: 'jsx_expression_container',
            text: '{...}',
            startIndex: expr.startIndex,
            endIndex: expr.endIndex,
            children: [expr],
          });
        }
        this.expectPunctuator('}');
      } else if (this.peek().type === TokenType.String || this.peek().type === TokenType.Identifier) {
        bodyChildren.push(this.createNode('jsx_text', this.advance().value));
      } else {
        break;
      }
    }

    children.push(...bodyChildren);

    if (this.peek().value === '<') {
      this.advance();
      if (this.peek().value === '/') this.advance();
      const closingName = this.peek().type === TokenType.Identifier ? this.advance().value : this.advance().value;
      this.expectPunctuator('>');
    }

    return {
      id: uuidv4(),
      type: 'jsx_element',
      text: `<${name}>`,
      startIndex: start,
      endIndex: this.peek().endIndex,
      children,
    };
  }

  private createNode(type: string, text: string): ASTNode {
    const token = this.tokens[Math.max(0, this.pos - 1)] || this.peek();
    return {
      id: uuidv4(),
      type,
      text: text.substring(0, 200),
      startIndex: token?.startIndex || 0,
      endIndex: token?.endIndex || 0,
      children: [],
    };
  }

  private createErrorNode(message: string): ASTNode {
    this.errorCount++;
    const token = this.peek();
    return {
      id: uuidv4(),
      type: 'ERROR',
      text: message.substring(0, 200),
      startIndex: token?.startIndex || 0,
      endIndex: token?.endIndex || 0,
      children: [],
      hasError: true,
      isErrorPlaceholder: true,
    };
  }

  private peek(): Token {
    return this.tokens[this.pos] || { type: TokenType.EOF, value: '', startIndex: 0, endIndex: 0 };
  }

  private advance(): Token {
    const token = this.tokens[this.pos];
    this.pos++;
    return token || { type: TokenType.EOF, value: '', startIndex: 0, endIndex: 0 };
  }

  private isAtEnd(): boolean {
    return this.pos >= this.tokens.length || this.tokens[this.pos].type === TokenType.EOF;
  }

  private expectKeyword(keyword: string): boolean {
    if (this.peek().value === keyword) {
      this.advance();
      return true;
    }
    this.errorCount++;
    return false;
  }

  private expectPunctuator(value: string): boolean {
    if (this.peek().value === value) {
      this.advance();
      return true;
    }
    this.errorCount++;
    return false;
  }

  private consumeSemicolon(): void {
    if (this.peek().value === ';') {
      this.advance();
    }
  }
}
