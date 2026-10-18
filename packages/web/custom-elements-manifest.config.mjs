// Read by `cem analyze`: the `generate` script and the drift check both run that command alone, so what the analyzer
// reads and where it writes is said here, once.
import fs from 'node:fs';
import path from 'node:path';

/**
 * What a class's `static properties` says of each property, read from the syntax tree: an options object written in
 * place, a constant it names (`forwardedDescription: FORWARDED_DESCRIPTION` — followed into the module it is imported
 * from) or the properties of another class spread into it (`...TanreiSearchRow.properties`). A declaration that cannot
 * be read stops the analysis: a guess here is an attribute in the manifest that no element reads, or a real one lost.
 *
 * @returns {Map<string, { state: boolean, attribute: string | false | null }>} `attribute`: the name the options give,
 *   `false` for none, `null` where the options do not say (Lit then uses the property's name, lower-cased).
 */
function declaredProperties(ts, classNode) {
  const source = classNode.getSourceFile();
  const found = new Map();
  const member = classNode.members.find((m) => m.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.StaticKeyword) && m.name?.getText() === 'properties');
  if (!member) return found;
  const object = unwrap(ts, ts.isGetAccessor(member) ? member.body?.statements.find(ts.isReturnStatement)?.expression : member.initializer);
  if (!object || !ts.isObjectLiteralExpression(object)) throw unreadable(classNode, 'static properties', source);
  for (const property of object.properties) {
    if (ts.isSpreadAssignment(property)) {
      // `...Other.properties`: the other class's own declaration, in this file.
      const spread = unwrap(ts, property.expression);
      const other = ts.isPropertyAccessExpression(spread) && spread.name.text === 'properties' && ts.isIdentifier(spread.expression) ? source.statements.find((s) => ts.isClassDeclaration(s) && s.name?.text === spread.expression.text) : null;
      if (!other) throw unreadable(classNode, property.getText(), source);
      for (const [name, options] of declaredProperties(ts, other)) found.set(name, options);
      continue;
    }
    const name = property.name && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) ? property.name.text : null;
    const value = ts.isPropertyAssignment(property) ? property.initializer : ts.isShorthandPropertyAssignment(property) ? property.name : null;
    if (name === null || !value) throw unreadable(classNode, property.getText(), source);
    const options = optionsObject(ts, value, source);
    if (!options) throw unreadable(classNode, property.getText(), source);
    found.set(name, readOptions(ts, options, classNode, source));
  }
  return found;
}

const unwrap = (ts, node) => {
  while (node && (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node) || ts.isTypeAssertionExpression?.(node))) node = node.expression;
  return node;
};

const unreadable = (classNode, what, source) => new Error(`tanrei-declared-attributes: cannot read ${what} of ${classNode.name?.getText()} in ${source.fileName} — write the options in place, or as a constant declared in this package`);

/** The options object an expression stands for: itself, or the constant it names, here or in the module it comes from. */
function optionsObject(ts, expression, source, depth = 0) {
  const node = unwrap(ts, expression);
  if (!node || depth > 4) return null;
  if (ts.isObjectLiteralExpression(node)) return node;
  if (!ts.isIdentifier(node)) return null;
  for (const statement of source.statements) {
    if (ts.isVariableStatement(statement)) {
      const declaration = statement.declarationList.declarations.find((d) => ts.isIdentifier(d.name) && d.name.text === node.text);
      if (declaration) return optionsObject(ts, declaration.initializer, source, depth + 1);
    }
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text.startsWith('.')) {
      const bindings = statement.importClause?.namedBindings;
      const imported = bindings && ts.isNamedImports(bindings) ? bindings.elements.find((e) => e.name.text === node.text) : null;
      if (!imported) continue;
      const original = (imported.propertyName ?? imported.name).text;
      const file = path.resolve(path.dirname(source.fileName), statement.moduleSpecifier.text.replace(/\.js$/, '.ts'));
      return exported(ts, original, file, depth + 1);
    }
  }
  return null;
}

const parsed = new Map();
/** A constant another module exports: declared there, or passed on from a third (`export { A } from './a.js'`, `export *`). */
function exported(ts, name, file, depth) {
  if (depth > 4 || !fs.existsSync(file)) return null;
  if (!parsed.has(file)) parsed.set(file, ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true));
  const source = parsed.get(file);
  const here = optionsObject(ts, ts.factory.createIdentifier(name), source, depth);
  if (here) return here;
  for (const statement of source.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier) || !statement.moduleSpecifier.text.startsWith('.')) continue;
    const next = path.resolve(path.dirname(file), statement.moduleSpecifier.text.replace(/\.js$/, '.ts'));
    if (!statement.exportClause) {
      const found = exported(ts, name, next, depth + 1);
      if (found) return found;
    } else if (ts.isNamedExports(statement.exportClause)) {
      const element = statement.exportClause.elements.find((e) => e.name.text === name);
      if (element) return exported(ts, (element.propertyName ?? element.name).text, next, depth + 1);
    }
  }
  return null;
}

function readOptions(ts, object, classNode, source) {
  const options = { state: false, attribute: null };
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) throw unreadable(classNode, property.getText(), source);
    const key = property.name.getText();
    const value = unwrap(ts, property.initializer);
    if (key === 'state') {
      if (value.kind !== ts.SyntaxKind.TrueKeyword && value.kind !== ts.SyntaxKind.FalseKeyword) throw unreadable(classNode, property.getText(), source);
      options.state = value.kind === ts.SyntaxKind.TrueKeyword;
    }
    if (key === 'attribute') {
      if (value.kind === ts.SyntaxKind.FalseKeyword) options.attribute = false;
      else if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) options.attribute = value.text;
      else if (value.kind !== ts.SyntaxKind.TrueKeyword) throw unreadable(classNode, property.getText(), source);
    }
  }
  return options;
}

/** The fields and accessors of a class that its doc comment keeps out of the manifest (`@internal`, `@ignore`). */
const internalMembers = (ts, classNode) =>
  classNode.members
    .filter((m) => (ts.isPropertyDeclaration(m) || ts.isGetAccessor(m) || ts.isSetAccessor(m)) && ts.getJSDocTags(m).some((tag) => ['internal', 'ignore'].includes(tag.tagName.text)))
    .map((m) => m.name.getText());

/**
 * The analyzer's Lit support makes an attribute of every entry of `static properties` whose options, written in place,
 * do not say `attribute: false`. Three things it gets wrong:
 *   - it does not know `state: true`, so it gives every piece of internal state an attribute of its own name;
 *   - it cannot read options given as a constant, so it loses `attribute: false` or another attribute's name in one;
 *   - a field the class keeps out of the manifest with `@internal` comes back from `static properties`, bare and public.
 * This reads the declarations themselves and, once a module is analyzed and before classes inherit from each other,
 * removes the attributes that do not exist, gives the others the name they are declared with, and removes the internal
 * fields again.
 */
function declaredAttributes() {
  /** module path → class name → { properties, internal } */
  const classes = new Map();
  return {
    name: 'tanrei-declared-attributes',
    analyzePhase({ ts, node, moduleDoc }) {
      if (!ts.isClassDeclaration(node) || !node.name) return;
      if (!classes.has(moduleDoc.path)) classes.set(moduleDoc.path, new Map());
      classes.get(moduleDoc.path).set(node.name.text, { properties: declaredProperties(ts, node), internal: internalMembers(ts, node) });
    },
    moduleLinkPhase({ moduleDoc }) {
      for (const declaration of moduleDoc.declarations ?? []) {
        const read = classes.get(moduleDoc.path)?.get(declaration.name);
        if (!read || declaration.kind !== 'class') continue;
        const internal = new Set(read.internal);
        const drop = (field) => {
          declaration.attributes = (declaration.attributes ?? []).filter((a) => a.fieldName !== field);
        };
        for (const [field, options] of read.properties) {
          const member = declaration.members?.find((m) => m.kind === 'field' && m.name === field);
          if (internal.has(field)) {
            drop(field);
            declaration.members = declaration.members?.filter((m) => m !== member);
          } else if (options.state || options.attribute === false) {
            drop(field);
            if (member) {
              delete member.attribute;
              delete member.reflects;
            }
          } else if (typeof options.attribute === 'string') {
            for (const attribute of declaration.attributes ?? []) if (attribute.fieldName === field) attribute.name = options.attribute;
            if (member) member.attribute = options.attribute;
          }
        }
        if (declaration.attributes && !declaration.attributes.length) delete declaration.attributes;
      }
    },
  };
}

/**
 * A composed element whole, as though it were written by itself (README "Composed elements"). In
 * a composed class each forwarded property is declared in place and says only where it is from; so does each event,
 * each slot passed on and each member whose parts are exported:
 *
 *     /** @from tanrei-field.label *\/                      on a field or an accessor of the class
 *     @fires input - => tanrei-one-time-code-input          in the class's comment
 *     @slot label-icon - => tanrei-field
 *     @exportparts tanrei-field                              every documented part of that member, under its own name
 *     @exportparts tanrei-field label: field-label, label    …but `label` as `field-label`, and — named again — bare too
 *     @exportparts tanrei-field -counter                     …and not `counter`, which this element never draws
 *
 * Where two members export a part under one bare name (W4, item 2: the two are never drawn at once), the manifest has
 * that name once, with both members' descriptions — the second after the tag of the member it is from — and each
 * member's own description under its prefixed name.
 *
 * Once every module is read, this puts the member's own entry in each of those places: the description, the type and
 * the default of a property and of its attribute, the type and the description of an event, the description of a
 * slot, and the member's parts with their descriptions. A source it cannot find stops the analysis: a forwarded entry
 * with nothing behind it would be a line of the manifest that says nothing.
 */
function composedFrom() {
  /** class name → { module, properties: Map<field, 'tag.prop'>, parts: [{ tag, renamed: Map<part, { as, bare }> }] } */
  const composed = new Map();
  const text = (tag) => (typeof tag.comment === 'string' ? tag.comment : (tag.comment ?? []).map((part) => part.text).join('')).trim();
  const stop = (name, what) => new Error(`tanrei-composed-from: ${name}: ${what}`);
  return {
    name: 'tanrei-composed-from',
    analyzePhase({ ts, node, moduleDoc }) {
      if (!ts.isClassDeclaration(node) || !node.name) return;
      const properties = new Map();
      for (const member of node.members) {
        if (!(ts.isPropertyDeclaration(member) || ts.isGetAccessor(member))) continue;
        const from = ts.getJSDocTags(member).find((tag) => tag.tagName.text === 'from');
        if (from) properties.set(member.name.getText(), text(from));
      }
      const parts = ts
        .getJSDocTags(node)
        .filter((tag) => tag.tagName.text === 'exportparts')
        .map((tag) => {
          const [member, ...rest] = text(tag).split(/\s+/);
          const renamed = new Map();
          const omitted = new Set();
          for (const entry of rest.join(' ').split(',').map((one) => one.trim()).filter(Boolean)) {
            if (entry.startsWith('-')) {
              omitted.add(entry.slice(1).trim());
              continue;
            }
            const [part, as] = entry.split(':').map((one) => one.trim());
            const now = renamed.get(part) ?? { as: null, bare: false };
            renamed.set(part, as ? { ...now, as } : { ...now, bare: true });
          }
          return { tag: member, renamed, omitted };
        });
      if (properties.size || parts.length) composed.set(node.name.text, { module: moduleDoc.path, properties, parts });
    },
    packageLinkPhase({ customElementsManifest }) {
      const declarations = customElementsManifest.modules.flatMap((module) => (module.declarations ?? []).map((declaration) => ({ declaration, path: module.path })));
      const byTag = (name, tag) => {
        const found = declarations.find(({ declaration }) => declaration.tagName === tag)?.declaration;
        if (!found) throw stop(name, `no element <${tag}> is declared in this package`);
        return found;
      };
      const ARROW = /^=>\s*(\S+)$/;
      for (const { declaration, path: modulePath } of declarations) {
        // A class that marks only an event or a slot is read too: the arrow is looked for in every declaration.
        const found = composed.get(declaration.name);
        const read = found?.module === modulePath ? found : { properties: new Map(), parts: [] };
        const name = declaration.name;
        for (const [field, from] of read.properties) {
          const at = from.indexOf('.');
          const [tag, property] = [from.slice(0, at), from.slice(at + 1)];
          const member = byTag(name, tag);
          const theirs = (member.members ?? []).find((m) => m.kind === 'field' && m.name === property);
          const ours = (declaration.members ?? []).find((m) => m.kind === 'field' && m.name === field);
          if (!theirs || !ours) throw stop(name, `${field} is from ${from}, and ${!ours ? 'the class has no such field' : `<${tag}> has no property "${property}"`}`);
          for (const key of ['description', 'type', 'default']) {
            if (key in theirs) ours[key] = theirs[key];
            else delete ours[key];
          }
          // Declared in place: an accessor the base class names abstractly is this class's own.
          delete ours.inheritedFrom;
          const attribute = (declaration.attributes ?? []).find((a) => a.fieldName === field);
          const theirAttribute = (member.attributes ?? []).find((a) => a.fieldName === property);
          if (attribute && !theirAttribute) throw stop(name, `${field} has an attribute, and ${from} has none`);
          if (attribute) {
            for (const key of ['description', 'type', 'default']) {
              if (key in theirAttribute) attribute[key] = theirAttribute[key];
              else delete attribute[key];
            }
          }
        }
        for (const [list, word] of [
          ['events', 'event'],
          ['slots', 'slot'],
        ]) {
          for (const entry of declaration[list] ?? []) {
            const tag = ARROW.exec(entry.description ?? '')?.[1];
            if (!tag) continue;
            const theirs = (byTag(name, tag)[list] ?? []).find((e) => e.name === entry.name);
            if (!theirs) throw stop(name, `the ${word} "${entry.name}" is from <${tag}>, which has no ${word} of that name`);
            entry.description = theirs.description;
            if (theirs.type) entry.type = theirs.type;
          }
        }
        for (const { tag, renamed, omitted } of read.parts) {
          const member = byTag(name, tag);
          if (!member.cssParts?.length) throw stop(name, `the parts of <${tag}> are exported, and it documents none`);
          for (const part of omitted) if (!member.cssParts.some((p) => p.name === part)) throw stop(name, `the part "${part}" of <${tag}> is left out, and <${tag}> documents no such part`);
          for (const part of renamed.keys()) if (!member.cssParts.some((p) => p.name === part)) throw stop(name, `the part "${part}" of <${tag}> is renamed, and <${tag}> documents no such part`);
          declaration.cssParts ??= [];
          for (const part of member.cssParts) {
            if (omitted.has(part.name)) continue;
            const rename = renamed.get(part.name);
            if (!rename || rename.bare) {
              const shared = declaration.cssParts.find((p) => p.name === part.name);
              if (shared) shared.description = `${shared.description} Or, drawn by \`<${tag}>\`: ${part.description}`;
              else declaration.cssParts.push({ ...part });
            }
            if (rename?.as) declaration.cssParts.push({ ...part, name: rename.as });
          }
        }
      }
    },
  };
}

/**
 * A base class that is not a component lives in `src/primitives/` and is analyzed so that its element inherits what it
 * declares (the navigation bar item's attributes come from its base). Only the base classes stay in the manifest: the
 * functions, constants and controllers of such a module are not part of the package's surface.
 */
const primitiveBasesOnly = {
  name: 'tanrei-primitive-bases-only',
  moduleLinkPhase({ moduleDoc }) {
    if (!moduleDoc.path.startsWith('src/primitives/')) return;
    const bases = new Set((moduleDoc.declarations ?? []).filter((d) => d.kind === 'class' && d.superclass).map((d) => d.name));
    moduleDoc.declarations = (moduleDoc.declarations ?? []).filter((d) => bases.has(d.name));
    moduleDoc.exports = (moduleDoc.exports ?? []).filter((e) => e.kind === 'js' && bases.has(e.declaration?.name));
  },
  // A component imports its base from the primitives' index, which is not analyzed, so the manifest named that file as
  // the base class's module. It names the module that declares the class.
  packageLinkPhase({ customElementsManifest }) {
    const modules = customElementsManifest.modules;
    const paths = new Set(modules.map((m) => m.path));
    for (const declaration of modules.flatMap((m) => m.declarations ?? [])) {
      const base = declaration.superclass;
      if (!base?.module || paths.has(base.module)) continue;
      const homes = modules.filter((m) => m.path.startsWith('src/primitives/') && m.declarations?.some((d) => d.kind === 'class' && d.name === base.name));
      if (homes.length === 1) base.module = homes[0].path;
    }
  },
};

export default {
  // The components, and the primitives that hold an element's base class (TanreiElement and TanreiLightElement, the
  // base of every element; NavigationDestination; the composed elements' ComposedElement and ComposedControl).
  // `src/m3-like.ts`: the entry of the components that live in the m3-like layer — the manifest lists their exports
  // under that module's path, so a reader sees which entry registers them.
  globs: ['src/components/**/*.ts', 'src/primitives/element.ts', 'src/primitives/destination.ts', 'src/primitives/composed.ts', 'src/m3-like.ts'],
  exclude: ['**/*.test.ts'],
  outdir: '.',
  litelement: true,
  plugins: [
    declaredAttributes(),
    primitiveBasesOnly,
    composedFrom(),
    {
      // The analyzer emits `modules` in a different order from run to run on unchanged sources, so unsorted, the
      // committed manifest would churn by thousands of lines and the drift check could not hold. Sorting by path makes the output a function of the sources.
      name: 'tanrei-sort-modules',
      packageLinkPhase({ customElementsManifest }) {
        customElementsManifest.modules.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
      },
    },
  ],
};
