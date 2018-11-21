
const postcss = require('postcss');

const defaults = {
  unitToConvert: 'px',
  viewportWidth: 750,
  viewportUnit: 'vmin',
  unitPrecision: 5,
  fontViewportUnit: 'vw',  // vmin is more suitable.
  propertyBlacklist: [],
  selectorBlackList: [],
  minPixelValue: 1,
  enableConvertComment: 'on',
  disableConvertComment: 'off',
  mediaQuery: false
};

module.exports = postcss.plugin('postcss-pixel-to-viewport', function (options) {
  const opts = Object.assign({}, defaults, options);
  const pxReplace = createPxReplace(opts.viewportWidth, opts.minPixelValue, opts.unitPrecision, opts.viewportUnit);


  // excluding regex trick: http://www.rexegg.com/regex-best-trick.html
  // Not anything inside double quotes
  // Not anything inside single quotes
  // Not anything inside url()
  // Any digit followed by px
  // !singlequotes|!doublequotes|!url()|pixelunit
  const pxRegex = new RegExp('"[^"]+"|\'[^\']+\'|url\\([^\\)]+\\)|(\\d*\\.?\\d+)' + opts.unitToConvert, 'ig');

  return function (css) {
    css.walkDecls(function (decl, i) {
      const next = decl.next();
      const commentText = next && next.type == 'comment' && next.text;
      if (decl.value.indexOf(opts.unitToConvert) === -1 || commentText === opts.disableConvertComment) {
        commentText === opts.disableConvertComment && next.remove();
        return;
      }

      if (blacklistedSelector(opts.selectorBlackList, decl.parent.selector)) return;

      if (commentText === opts.enableConvertComment || !blacklistedProperty(opts.propertyBlacklist, decl.prop)) {
        commentText === opts.enableConvertComment && next.remove();
        const unit = getUnit(decl.prop, opts)
        decl.value = decl.value.replace(pxRegex, createPxReplace(opts.viewportWidth, opts.minPixelValue, opts.unitPrecision, unit));
      }
    });

    if (opts.mediaQuery) {
      css.walkAtRules('media', function (rule) {
        if (rule.params.indexOf(opts.unitToConvert) === -1) return;
        rule.params = rule.params.replace(pxRegex, pxReplace);
      });
    }

  };
});

function getUnit(prop, opts) {
  return prop.indexOf('font') === -1 ? opts.viewportUnit : opts.fontViewportUnit;
}

function createPxReplace(viewportSize, minPixelValue, unitPrecision, viewportUnit) {
  return function (m, $1) {
    if (!$1) return m;
    const pixels = parseFloat($1);
    if (pixels <= minPixelValue) return m;
    return toFixed((pixels / viewportSize * 100), unitPrecision) + viewportUnit;
  };
}

function toFixed(number, precision) {
  var multiplier = Math.pow(10, precision + 1),
    wholeNumber = Math.floor(number * multiplier);
  return Math.round(wholeNumber / 10) * 10 / multiplier;
}

function blacklistedProperty(blacklist, property) {
  if (typeof property !== 'string') return;
  return blacklist.some(function (regex) {
    if (typeof regex === 'string') return property.indexOf(regex) !== -1;
    return property.match(regex);
  });
}

function blacklistedSelector(blacklist, selector) {
  return blacklistedProperty(blacklist, property);
}
