var debug = require("debug")("cms:frontend"),
  console = require("better-console");
editables = require("../db").editables,
extend = require("extend"),
config = require("config"),
cheerio = require("cheerio");

module.exports = frontend;

function frontend(app) {
  //Make app config available to views
  app.locals.config = config;
  app.get("/", frontendMiddleware);
  debug("These plugins are reachable to this module: %s", JSON.stringify(app.plugins));


  function frontendMiddleware(req, res, next) {
    frontend.renderFrontend(app, {
      previewing: true,
      // Kludge beacuse the index view does not 
      // have res.locals with the same value that
      // an res.render
      session: res.locals.session
    }, function(err, html) {
      return res.send(html);
    });


  }

}
/**
 * @param {express.Application} app. For using app.render()
 * @param {Function} cb
 *  -- {Error} err. Null if nothing bad happened
 *  -- {String} html. rendered html for the index view
 */
frontend.renderFrontend = function(app, locals, cb) {
  var renderedFrontend = '';
  editables.all(function(err, updatedEditables) {
    locals = extend({}, locals);

    app.render("index", locals, function(err, html) {
      if (err) {
        console.error("Frontend render error: %s", err.toString());
        return cb(err);
      }
      var a = updatedEditables.reduce(function(obj, cur) {
        obj[cur.editableId] = cur;
        return obj
      }, {});
      var $ = cheerio.load(html);

      // Replace all data-editable elements
      // with the last stored HTML for that element
      $("[data-editable!=''][data-editable]").each(function() {
        var editableId = $(this).attr("data-editable");
        // For all data-editables declared on the template
        // but are unmodified by the user
        if (a[editableId]) {
          $(this).html(a[editableId].html);
        }
      });
      renderedFrontend = $.html();
      return cb(null, renderedFrontend);
    });
  });

}