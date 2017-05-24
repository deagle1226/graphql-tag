"use strict";

const gql = require('./src');

// Takes `source` (the source GraphQL query string)
// and `doc` (the parsed GraphQL document) and tacks on
// the imported definitions.
function expandImports(source, doc) {
  const lines = source.split('\n');
  let outputCode = `
    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
    function sort(defs) {
      return defs.sort(function(a, b) {
        if (a.kind < b.kind) return 1;
        if (a.kind > b.kind || a.name.value > b.name.value) return -1;
        return 1;
      });
    }
  `;

  lines.some((line) => {
    if (line[0] === '#' && line.slice(1).split(' ')[0] === 'import') {
      const importFile = line.slice(1).split(' ')[1];
      const parseDocument = `require(${importFile})`;
      const appendDef = `doc.definitions = doc.definitions.concat(unique(${parseDocument}.definitions));`;
      outputCode += appendDef + "\n";
    }
    return (line.length !== 0 && line[0] !== '#');
  });

  return outputCode += '\n' + 'doc.definitions = sort(doc.definitions)';
}

module.exports = function(source) {
  this.cacheable();
  const doc = gql`${source}`;
  const outputCode = `
    var doc = ${JSON.stringify(doc)};
    doc.loc.source = ${JSON.stringify(doc.loc.source)};
  `;
  const importOutputCode = expandImports(source, doc);

  return outputCode + "\n" + importOutputCode + "\n" + `module.exports = doc;`;
};
