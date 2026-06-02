import type { ASTNode } from '../../../../packages/shared/src';

const DECLARATION_TYPES = new Set([
  'function_declaration',
  'function',
  'arrow_function',
  'function_expression',
  'method_definition',
  'class_declaration',
  'class',
  'variable_declaration',
  'lexical_declaration',
  'import_declaration',
  'export_statement',
  'export_default_declaration',
  'export_named_declaration',
  'declare_function',
  'declare_class',
  'declare_variable',
  'interface_declaration',
  'type_alias_declaration',
  'enum_declaration',
  'module',
  'program',
]);

const VARIABLE_TYPES = new Set([
  'variable_declarator',
  'identifier',
  'type_identifier',
  'predefined_type',
  'property_identifier',
  'shorthand_property_identifier',
  'this',
]);

const JSX_TYPES = new Set([
  'jsx_element',
  'jsx_self_closing_element',
  'jsx_opening_element',
  'jsx_closing_element',
  'jsx_fragment',
  'jsx_expression',
  'jsx_attribute',
  'jsx_text',
  'jsx_namespace_name',
]);

const EXPRESSION_TYPES = new Set([
  'call_expression',
  'member_expression',
  'binary_expression',
  'unary_expression',
  'logical_expression',
  'conditional_expression',
  'assignment_expression',
  'augmented_assignment_expression',
  'new_expression',
  'await_expression',
  'yield_expression',
  'template_string',
  'template_substitution',
  'spread_element',
  'sequence_expression',
  'parenthesized_expression',
  'type_assertion',
  'as_expression',
  'satisfies_expression',
]);

const STATEMENT_TYPES = new Set([
  'if_statement',
  'for_statement',
  'for_in_statement',
  'of_statement',
  'while_statement',
  'do_statement',
  'switch_statement',
  'case',
  'try_statement',
  'catch',
  'finally',
  'throw_statement',
  'return_statement',
  'break_statement',
  'continue_statement',
  'with_statement',
  'labeled_statement',
  'statement_block',
  'block',
  'expression_statement',
  'empty_statement',
  'debugger_statement',
]);

const LITERAL_TYPES = new Set([
  'number',
  'string',
  'template_string',
  'regex',
  'true',
  'false',
  'null',
  'undefined',
  'void',
  'array',
  'object',
  'pair',
  'computed_property_name',
]);

const PATTERN_TYPES = new Set([
  'object_pattern',
  'array_pattern',
  'rest_pattern',
  'assignment_pattern',
  'destructuring_pattern',
]);

const COLOR_MAP: Record<string, string> = {
  declaration: '#00e5ff',
  variable: '#76ff03',
  jsx: '#e040fb',
  expression: '#ff9100',
  statement: '#448aff',
  literal: '#ffff00',
  pattern: '#b388ff',
  error: '#ff1744',
  other: '#ffffff',
};

function classifyNodeType(type: string): string {
  if (DECLARATION_TYPES.has(type)) return 'declaration';
  if (VARIABLE_TYPES.has(type)) return 'variable';
  if (JSX_TYPES.has(type)) return 'jsx';
  if (EXPRESSION_TYPES.has(type)) return 'expression';
  if (STATEMENT_TYPES.has(type)) return 'statement';
  if (LITERAL_TYPES.has(type)) return 'literal';
  if (PATTERN_TYPES.has(type)) return 'pattern';
  return 'other';
}

export function getNodeColor(type: string, hasError: boolean): string {
  if (hasError) return COLOR_MAP.error;
  const category = classifyNodeType(type);
  return COLOR_MAP[category] ?? COLOR_MAP.other;
}

export function getCategoryColor(category: string): string {
  return COLOR_MAP[category] ?? COLOR_MAP.other;
}

export { COLOR_MAP, classifyNodeType };

export type NodeCategory = keyof typeof COLOR_MAP;

export function getNodeCategory(node: ASTNode): NodeCategory {
  if (node.hasError) return 'error';
  return classifyNodeType(node.type) as NodeCategory;
}
