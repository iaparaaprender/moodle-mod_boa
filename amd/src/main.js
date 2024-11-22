// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * JS to connect with BoA repositories.
 *
 * @module     mod_boa/main
 * @copyright  2024 David Herney @ BambuCo
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define(['jquery',
        'core/modal_factory',
        'core/modal_events',
        'core/templates',
        'core/log',
        'core/ajax',
        'mod_boa/util'],
    function($,
            ModalFactory,
            ModalEvents,
            Templates,
            Log,
            Ajax,
            BoAUtil) {

    var $errorBox = null;

    var global = {
        selected: []
    };

    // Load strings.
    var strings = [
        {key: 'noresultsfound', component: 'mod_boa'},
        {key: 'removeselected', component: 'mod_boa'},
        {key: 'saved', component: 'mod_boa'},
        {key: 'notsaved', component: 'mod_boa'}
    ];
    var s = [];

    $.boasearch = function(el, params) {
        var $boasearch = $(el);
        var $boasearchBox;
        var $boasearchSuggestions = $('<ul class="boasearch-suggestions"></ul>');
        var cacheResults = [];
        var requestObjects = [];
        var startRecord = 0;

        $boasearch.wrap('<span class="boasearch-box"></span>');

        $boasearchBox = $boasearch.parent();
        $boasearchBox.append($boasearchSuggestions);

        $boasearchSuggestions.customReset = function() {
            $boasearchSuggestions.empty();
            $boasearchSuggestions.hide();
            $boasearchSuggestions.data('off', true);
        };

        $boasearchSuggestions.customReset();

        if (params.options) {
            params.options = $.extend({}, $.boasearch.defaults.options, params.options);
        }

        if (params.events) {
            params.events = $.extend({}, $.boasearch.defaults.events, params.events);
        }

        if (params.results) {
            params.results = $.extend({}, $.boasearch.defaults.results, params.results);
        }

        $boasearch.conf = $.extend({}, $.boasearch.defaults, params);

        $boasearch.attr('autocomplete', 'off');

        var ferror = function(txt, level) {
            switch (level) {
                case 'dev':
                    if ($boasearch.conf.debug) {
                        Log.debug('BoASearch - ' + txt);
                    }
                break;
                default:
                    Log.debug('BoASearch - ' + txt);
            }
        };

        // Store a reference to the BoASearch object.
        $.data(el, "boasearch", $boasearch);

        // Private methods.
        var methods = {
            init: function() {
                if (!$boasearch.conf.apiuri) {
                    ferror('Configuration error: You need set the API URI.');
                    return;
                }

                $boasearch.on('keypress', function(event) {
                    if (event.keyCode) {
                        switch (event.keyCode) {
                            case 13: // Enter
                                event.preventDefault();
                                $boasearchSuggestions.customReset();
                                break;
                            case 27: // Escape
                                $boasearchSuggestions.customReset();
                                break;
                            case 38: // Up
                                if (!$boasearchSuggestions.data('off')) {
                                    methods.previousItemMarkup();
                                }
                                break;
                            case 40: // Down
                                if (!$boasearchSuggestions.data('off')) {
                                    methods.nextItemMarkup();
                                }
                                break;
                        }
                    }
                });

                $boasearch.on('keyup', function(event) {
                    var val = $boasearch.val();

                    var specialKeys = [13, 16, 17, 18, 27, 33, 34, 35, 36, 37, 38, 39, 45, 144];
                    if (!$boasearchSuggestions.data('off')) {
                        specialKeys[specialKeys.length] = 40;
                    }

                    if (event.keyCode && specialKeys.indexOf(event.keyCode) == -1) {
                        if (val.length >= $boasearch.conf.options.minLetters) {
                            $boasearch.printSuggestions(val);
                        } else {
                            $boasearchSuggestions.customReset();
                        }
                    } else if (event.keyCode === 13) {
                        $boasearch.search();
                    }
                });

                $boasearchBox.on('focusout', function() {
                    window.setTimeout(function() {
                        $boasearchSuggestions.customReset();
                    }, 100);
                });
            },

            /**
             * Build a suggestion item
             *
             * @param {object} item the current item data to render
             * @param {string} query the last query submited to the server.
             */
            getItemMarkup: function(item, query) {
                var text = item.query != '' ? methods.highlightString(item.query, query) : '';

                var $item = $('<li>' + text + '</li>');

                $item.on('click', function() {
                    var $this = $(this);
                    $boasearchSuggestions.customReset();
                    $boasearch.val($this.text());
                });

                return $item;
            },

            highlightString: function(str, query) {
                var n = str.toLowerCase().indexOf(query.toLowerCase());
                if (n >= 0) {
                    var before = str.substr(0, n);
                    var word = str.substr(n, query.length);
                    var after = str.substr(n + query.length);

                    str = before + '<em>' + word + '</em>' + after;
                }
                return str;
            },

            nextItemMarkup: function() {
                var $current = $boasearchSuggestions.find('.current');
                var oldposition, newposition;

                if ($current.length < 1) {
                    oldposition = -1;
                } else {
                    oldposition = $current.index();
                }

                newposition = oldposition + 1;

                if ($boasearchSuggestions.find('> li').length <= newposition) {
                    newposition = 0;
                }

                $current.removeClass('current');
                var $new = $boasearchSuggestions.children().eq(newposition);

                $new.addClass('current');
                $boasearch.val($new.text());
            },

            previousItemMarkup: function() {
                var $current = $boasearchSuggestions.find('.current');
                var oldposition, newposition;

                if ($current.length < 1) {
                    oldposition = -1;
                } else {
                    oldposition = $current.index();
                }

                newposition = oldposition - 1;

                if (newposition < 0) {
                    newposition = $boasearchSuggestions.find('> li').length - 1;
                }

                $current.removeClass('current');
                var $new = $boasearchSuggestions.children().eq(newposition);

                $new.addClass('current');
                $boasearch.val($new.text());
            },

            printItemsMarkup: function(title, data, query) {

                if (data.length > 0) {
                    $.each(data, function(k, item) {
                        var $item = methods.getItemMarkup(item, query, k);
                        $boasearchSuggestions.append($item);
                    });

                    $boasearchSuggestions.show();
                    $boasearchSuggestions.data('off', false);
                }
            },

            initSearch: function() {
                if (typeof $boasearch.conf.events.onstart == 'function') {
                    $boasearch.conf.events.onstart(startRecord > 0);
                } else {
                    if ($boasearch.conf.results.target) {
                        $($boasearch.conf.results.target).addClass('loading');
                        if (startRecord === 0) {
                            $($boasearch.conf.results.target).empty();
                        }
                    }
                }
            },

            printResultSearch: function(data) {

                if (typeof $boasearch.conf.events.onfound == 'function') {
                    $boasearch.conf.events.onfound(data, startRecord);
                } else {
                    if ($boasearch.conf.results.target) {
                        var $target = $($boasearch.conf.results.target);
                        $target.removeClass('loading');

                        $.each(data, function(k, item) {
                            var $html = $('<div class="boa-video"></div>');
                            var preview = BoAUtil.choosePreview(item);
                            $html.append('<a href="' + item.about + '"><h5>' + item.metadata.general.title.none + '</h5></a>');
                            $html.append('<a href="' + item.about + '"><img src="' + preview + '.img" /></a>');
                            $html.append('<p>' + item.metadata.general.description.none + '</p>');

                            $target.append($html);
                        });
                    }
                }
            }

        };

        // Public methods
        $boasearch.printSuggestions = function(query) {

            for (var request in requestObjects) {
                if (request && typeof request === 'object') {
                    request.abort();
                }
            }

            $boasearchSuggestions.customReset();
            requestObjects = [];

            var uri = $boasearch.conf.apiuri;
            uri = uri.substr(0, uri.indexOf('/resources'));
            uri += '/queries.json';

            var params = {
                "q": query,
                "(n)": $boasearch.conf.options.suggestionsSize
            };

            if ($boasearch.conf.filters.length > 0) {
                var filters = $boasearch.conf.filters.join(' AND ');
                params.filter = filters;
            }

            // Not for specific catalogues yet.
            var cataloguename = '';
            requestObjects[requestObjects.length] = $.get(uri, params, function(data) {

                if (data.length > 0) {
                    data.sort(function(a, b) {
                        return b.size - a.size;
                    });

                    methods.printItemsMarkup(cataloguename, data, query);
                }
            });
        };

        $boasearch.search = function() {

            var currentTime = Date.now();

            var query = $boasearch.val();

            if (query.length < $boasearch.conf.options.minLetters) {
                return false;
            }

            methods.initSearch();

            if (cacheResults[query] && cacheResults[query].timeQuery > (currentTime - $boasearch.conf.options.cacheLife)) {
                methods.printResultSearch(cacheResults[query].data);
                return true;
            }

            cacheResults[query] = {
                timeQuery: currentTime,
                data: []
            };

            var params = {
                "q": query,
                "(n)": $boasearch.conf.options.resultsSize,
                "(s)": startRecord
            };

            if ($boasearch.conf.filters.length > 0) {
                $.each($boasearch.conf.filters, function(k, filter) {
                    if (typeof filter.value == 'object') {
                        $.each(filter.value, function(m, val) {
                            params['(meta)[' + filter.meta + '][' + m + ']'] = val;
                        });
                    } else {
                        params['(meta)[' + filter.meta + ']'] = filter.value;
                    }
                });
            }

            $.ajax({
                url: $boasearch.conf.apiuri,
                data: params,
                dataType: 'json',
                success: function(data) {
                    $boasearchSuggestions.empty();

                    if (typeof data === 'object' && data.error) {
                        $boasearch.conf.events.onerror(data);
                        data = [];
                    }

                    if (data.length > 0) {
                        data.sort(function(a, b) {
                            return b.size - a.size;
                        });

                        cacheResults[query].data = data;

                    }

                    methods.printResultSearch(data);
                },
                error: function(xhr) {
                    var data = xhr.responseText;
                    $boasearch.conf.events.onerror($.parseJSON(data));
                },
                fail: function(xhr) {
                    var data = xhr.responseText;
                    $boasearch.conf.events.onerror($.parseJSON(data));
                }
            });

            return true;

        };

        $boasearch.searchMore = function() {
            startRecord += $boasearch.conf.options.resultsSize;
            $boasearch.search();
        };

        $boasearch.restart = function() {
            startRecord = 0;
        };

        // BoA: Initialize.
        methods.init();
    };

    // BoA: Default Settings.
    $.boasearch.defaults = {
        apiuri: null,
        catalogues: [],
        filters: [],
        options: {
            suggestionsSize: 10,
            resultsSize: 10,
            minLetters: 3,
            cacheLife: 60000 // 60 seconds
        },
        debug: false,
        results: {
            target: null,
            template: null
        },
        events: {
            onstart: null,
            onfound: null,
            onerror: function(error) {
                Log.debug('BoASearch - search error');
                Log.debug(error);
                return true;
            }
        }
    };

    // BoA: Plugin Function.
    $.fn.boasearch = function(params, paramval) {
        if (params === undefined) {
            params = {};
        }

        if (typeof params === "object") {
            return this.each(function() {
                new $.boasearch(this, params);
            });
        } else {

            var $boasearch = null;

            if ('data' in this) {
                $boasearch = this.data('boasearch');
            } else {

                if ('data' in $(this)) {
                    $boasearch = $(this).data('boasearch');
                }
            }

            if ($boasearch) {

                switch (params) {
                    case "search": $boasearch.search(); break;
                    case "nextsearch": $boasearch.searchMore(); break;
                    case "option": return $boasearch.conf.options[paramval];
                    case "restart": $boasearch.restart(); break;
                    case "choosePreview": return BoAUtil.choosePreview(paramval);
                }
            } else {
                Log.debug('Error in boasearch object');
            }
        }

        return true;
    };

    var binditem = function($item) {

        $item.find('[boa-href]').on('click', function() {
            var $this = $(this);

            var modalresource = $this.data('modal');

            if (modalresource) {
                modalresource.show();
                return;
            }

            var request = $.get($this.attr('boa-href'))
                .then(function(data) {

                    data.custom = {};
                    data.custom.preview = BoAUtil.chooseView(data);
                    data.custom.type = (data.metadata.technical && data.metadata.technical.format) ?
                                            data.metadata.technical.format : '';
                    data.custom.score = 'avg' in data.social.score ?
                                            data.social.score.avg + ' / ' + data.social.score.count : 0;
                    data.custom.downloadable = BoAUtil.isDownloadable(data);
                    data.about = encodeURI(data.about);

                    var socialnetworksitems = [];
                    $.each(global.socialnetworks, function(i, v) {
                        var url = v.url.replace('{url}', encodeURI(data.about + '/!/'));
                        url = url.replace('{name}', data.metadata.general.title.none);

                        var item = {};
                        item.url = url;
                        item.icon = v.icon;
                        socialnetworksitems.push(item);
                    });

                    data.custom.socialnetworks = socialnetworksitems;

                    if (typeof data.metadata.general.keywords.none == 'object') {
                        data.metadata.general.keywords.none = data.metadata.general.keywords.none.join(', ');
                    }

                    return Templates.render('mod_boa/viewresource', data);
                })
                .then(function(html) {

                    var $html = $(html);
                    $html.find('[data-addtoselection]').on('click', function() {
                        var $thisobject = $(this);

                        if (global.selected[$thisobject.data('addtoselection')]) {
                            global.selected[$thisobject.data('addtoselection')].detach();
                            delete global.selected[$thisobject.data('addtoselection')];
                        } else {
                            global.selected[$thisobject.data('addtoselection')] = $item;
                            $thisobject.removeClass('btn-primary').addClass('btn-danger');
                            $thisobject.find('span').html(s.removeselected);
                            refreshadded();
                        }
                        $this.data('modal').hide();
                    });

                    return $html;
                })
                .catch(function(error) {
                    Log.debug(error);
                });

            ModalFactory.create({
                body: request.promise()
            })
            .then(function(modal) {
                modalresource = modal;

                if ($item.data('metadata')) {
                    let itemdata = $item.data('metadata');
                    modalresource.setTitle(itemdata.metadata.general.title.none);
                }
                modal.getModal().addClass('block_boasearch-modal');
                modal.show();

                var root = modal.getRoot();
                root.on(ModalEvents.hidden, function() {

                    // Stop audio and video when close the window.
                    $(modal.getBody()).find('video').each(function() {
                        this.pause();
                    });

                    $(modal.getBody()).find('audio').each(function() {
                        this.pause();
                    });

                    $(modal.getBody()).find('iframe').each(function() {
                        let $iframe = $(this);
                        $iframe.attr('src', 'about:blank');
                        $this.data('modal', null);
                    });
                });

                $this.data('modal', modalresource);

                return true;
            })
            .catch(function(error) {
                Log.debug(error);
            });

        });

    };

    var refreshadded = function(change = true) {

        var $container = $('#boa-currentselection > div.boa-items');
        $container.children().detach();
        $('#boa-currentselection > .alert').detach();

        if (change) {
            $('#boa-currentselection .boa-saveselection').show();
        }

        if (!global.selected) {
            return;
        }

        for (var about in global.selected) {
            let $item = global.selected[about];

            if ($item) {
                $container.append($item);
                continue;
            }

            $.get(about)
                .then(function(data) {
                    data.thumb = BoAUtil.choosePreview(data);

                    var $item = $(BoAUtil.itemContent(data));
                    binditem($item);
                    $item.data('metadata', data);
                    global.selected[data.about] = $item;
                    $container.append($item);
                    return true;
                })
                .fail(function(e) {
                    Log.debug('Error loading resource');
                    Log.debug(e);
                });

        }
    };

    /**
     * Initialise all for the block.
     *
     * @param {string} blockid The block id.
     * @param {int} cmid The course module id.
     * @param {array} boauri The BoA API URI.
     * @param {int} pagesize The number of items to show.
     * @param {array} socialnetworks The social networks to share.
     */
    var init = function(blockid, cmid, boauri, pagesize, socialnetworks) {

        pagesize = pagesize ? pagesize : 10;
        global.socialnetworks = socialnetworks;

        // The variable "boacurrentselection" comes from the template because it can be so large that it cannot be passed
        // by parameters since it exceeds the limit for these values.
        $.each(M.boacurrentselection, function(index, uri) {
            global.selected[uri] = null;
        });

        s = BoAUtil.loadStrings(strings);

        $('#' + blockid).each(function() {
            var $thisblock = $(this);
            var $searchResult = $thisblock.find('[data-control="search-result"]');
            var $boaSearch = $thisblock.find('[data-control="search-text"]');

            $errorBox = $thisblock.find('[data-control="errors-box"]');

            $thisblock.find('[data-control="search-button"]').on('click', function() {
                $thisblock.find('> .search-result').empty();
                $boaSearch.boasearch('restart');
                $boaSearch.boasearch('search');
            });

            $boaSearch.boasearch({
                apiuri: boauri[0],
                catalogues: [],
                filters: [],
                options: {
                    cacheLife: 2000,
                    resultsSize: pagesize
                },
                events: {
                    onstart: function(more) {
                        $searchResult.addClass('loading');
                        $searchResult.show();

                        if (!more) {
                            $searchResult.find('> .boa-content').empty();
                        }
                    },
                    onfound: function(data, start) {

                        $searchResult.removeClass('loading');
                        var $target = $searchResult.find('> .boa-content');

                        var resultsSize = $boaSearch.boasearch('option', 'resultsSize');

                        if (data.length === 0 || data.length < resultsSize) {
                            $searchResult.find('> button').hide();
                        } else {
                            $searchResult.find('> button').show();
                        }

                        if (start == 0) {
                            $thisblock.find('[data-control="show-one"]').empty();
                        }

                        if ((!data || data.length === 0) && start == 0) {
                            $target.empty();

                            var content = BoAUtil.showMessage(s.noresultsfound);

                            $target.append(content);
                            return;
                        }

                        $.each(data, function(k, item) {

                            // Check if the item is already selected.
                            if (global.selected[item.about]) {
                                return;
                            }

                            if (item.manifest.conexion_type == 'external') {
                                item.finaluri = item.manifest.url;
                            } else {
                                item.finaluri = item.about + '/!/';

                                if (item.manifest.entrypoint) {
                                    item.finaluri += item.manifest.entrypoint;
                                }
                            }

                            item.thumb = BoAUtil.choosePreview(item);

                            var $item = $(BoAUtil.itemContent(item));
                            $item.data('metadata', item);
                            $item.appendTo($target);

                            binditem($item);
                        });
                    },
                    onerror: function(error) {
                        var $target = $errorBox;
                        $target.empty();

                        var $node = BoAUtil.showMessage(error.message, 'error', error.info);
                        $target.append($node);

                        Log.debug(error);

                        $target.removeClass('loading');
                    }
                }
            });

            $searchResult.find('> button').on('click', function() {
                $boaSearch.boasearch('nextsearch');
            });

        });

        var $saveselection = $('#boa-currentselection .boa-saveselection');
        $saveselection.hide();
        $saveselection.on('click', function() {
            var $thisbutton = $(this);

            var data = [];
            for (var about in global.selected) {
                data.push(about);
            }

            Ajax.call([{
                methodname: 'mod_boa_select_resources',
                args: {
                    cmid: cmid,
                    list: data
                }
            }])[0].then(function(data) {

                if (data) {
                    let $msg = BoAUtil.showMessage(s.saved, 'success');
                    $saveselection.after($msg);
                } else {
                    let $msg = BoAUtil.showMessage(s.notsaved);
                    $saveselection.after($msg);
                }

                $thisbutton.hide();

                return true;
            }).fail(function(e) {
                Log.debug('Error saving resources selected');
                Log.debug(e);
            });
        });

        refreshadded(false);
    };

    return {
        init: init
    };
});
