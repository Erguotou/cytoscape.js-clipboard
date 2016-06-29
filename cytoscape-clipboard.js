;(function () {
    'use strict';

    // registers the extension on a cytoscape lib ref
    var register = function (cytoscape) {

        if (!cytoscape) {
            return;
        } // can't register if cytoscape unspecified


        var _instance;
        var initialized = false;
        cytoscape('core', 'clipboard', function (opts) {
            var cy = this;

            var options = {
                clipboardSize: 0,
                shortcuts: {
                    enabled: true,
                    undoable: true
                }
            };

            $.extend(true, options, opts);


            var counter = 0;

            function guid() {
                function s4() {
                    return Math.floor((1 + Math.random()) * 0x10000)
                        .toString(16)
                        .substring(1);
                }

                return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                    s4() + '-' + s4() + s4() + s4();
            }


            function getItemId(last) {
                return last ? "item_" + counter : "item_" + (++counter);
            }

            function getCloneId() {
                return guid();
            }


            var oldIdToNewId = {};

            function changeIds(jsons) {
                jsons = $.extend(true, [], jsons);
                for (var i = 0; i < jsons.length; i++) {
                    var jsonFirst = jsons[i];
                    var id = getCloneId();
                    oldIdToNewId[jsonFirst.data.id] = id;
                    jsonFirst.data.id = id;
                }

                for (var j = 0; j < jsons.length; j++) {
                    var json = jsons[j];
                    var fields = ["source", "target", "parent"];
                    for (var k = 0; k < fields.length; k++) {
                        var field = fields[k];
                        if (json.data[field] && oldIdToNewId[json.data[field]])
                            json.data[field] = oldIdToNewId[json.data[field]];


                    }
                    if (json.position.x) {
                        json.position.x += 50;
                        json.position.y += 50;
                    }
                }

                return jsons;

            }

            if (!initialized) {
                initialized = true;
                var ur;
                var clipboard = {};
                if (options.shortcuts.enabled) {
                    var undoable = options.shortcuts.undoable && (cy.undoRedo ? true : false);
                    if (undoable)
                        ur = cy.undoRedo({}, true);

                    document.addEventListener("keydown", function (e) {
                        if (e.ctrlKey)
                            if (e.which == 67) // CTRL + C
                                _instance.copy(cy.$(":selected"));
                            else if (e.which == 86) // CTRL + V
                                if (undoable)
                                    ur.do("paste");
                                else
                                    _instance.paste();
                            else if (e.which == 65) {
                                cy.elements().select();
                                e.preventDefault();
                            }
                    });
                }

                _instance = {
                    copy: function (eles, _id) {
                        var id = _id ? _id : getItemId();
                        eles.unselect();
                        var descs = eles.nodes().descendants();
                        var nodes = eles.nodes().union(descs).filter(":visible");
                        var edges = nodes.edgesWith(nodes).filter(":visible");

                        clipboard[id] = {nodes: nodes.jsons(), edges: edges.jsons()};
                        return id;
                    },
                    paste: function (_id) {
                        var id = _id ? _id : getItemId(true);
                        var res = cy.collection();
                        if (clipboard[id]) {
                            var nodes = changeIds(clipboard[id].nodes);
                            var edges = changeIds(clipboard[id].edges);
                            oldIdToNewId = {};
                            cy.batch(function () {
                                res = cy.add(nodes).union(cy.add(edges));
                                res.select();
                            });

                        }
                        return res;
                    }
                };

                if (cy.undoRedo) {
                    ur = cy.undoRedo({}, true);
                    ur.action("paste", function (eles) {
                        return eles.firstTime ? _instance.paste(eles.id) : eles.restore();
                    }, function (eles) {
                        return eles.remove();
                    });
                }

            }
            return _instance; // chainability
        });

    };

    if (typeof module !== 'undefined' && module.exports) { // expose as a commonjs module
        module.exports = register;
    }

    if (typeof define !== 'undefined' && define.amd) { // expose as an amd/requirejs module
        define('cytoscape-clipboard', function () {
            return register;
        });
    }

    if (typeof cytoscape !== 'undefined') { // expose to global cytoscape (i.e. window.cytoscape)
        register(cytoscape);
    }

})();
