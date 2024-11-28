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
 * Useful features for the OVA management process.
 *
 * @module     mod_boa/util
 * @copyright  2024 David Herney @ BambuCo
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import $ from 'jquery';
import {get_strings as getStrings} from 'core/str';
import Log from 'core/log';

/* eslint complexity: ["error", 30] */
export const chooseView = (data) => {

    var $res = null;

    // If it is a external resource.
    if (data.manifest.conexion_type && data.manifest.conexion_type == 'external') {
        $res = $('<iframe></iframe>');
        $res.attr('src', data.manifest.url);

        var $reslink = $('<p><a target="_blank"></a></p>');
        $reslink.find('a').attr('href', data.manifest.url).html(data.manifest.url);

        return $res.get(0).outerHTML + $reslink.get(0).outerHTML;
    }

    if (!data.metadata.technical || !data.metadata.technical.format) {
        return $res;
    }

    if (data.metadata.technical.format.match(/pdf/gi) ||
            data.metadata.technical.format.match(/html/gi) ||
            data.metadata.technical.format.match(/tepuy/gi)) {
        var proxyuri = 'proxy/index.php/' + window.btoa(data.about + '/!/') + '/';

        // The id scorm_object is a hack to play Tepuy objects.
        $res = $('<iframe id="scorm_object"></iframe>');
        $res.attr('src', proxyuri);
        $res.attr('type', data.metadata.technical.format);

        return $res;
    }

    var src = '';
    var alternatebase;
    if (data.id.indexOf('/content/') >= 0) {
        alternatebase = data.id.substr(data.id.indexOf('/content/') + 9);
    } else {
        alternatebase = data.manifest.entrypoint;
    }

    if (data.manifest.alternate && data.manifest.entrypoint) {
        var alterpath = data.about + '/!/.alternate/' + alternatebase + '/';
        var name = '';

        if (data.metadata.technical.format.match(/video/gi) ||
                data.metadata.technical.format.match(/audio/gi) ||
                data.metadata.technical.format.match(/image/gi)) {

            if (typeof data.manifest.alternate == 'object') {
                name = data.manifest.alternate.find(e => /small/g.test(e));

                if (name) {
                    src = alterpath + name;
                } else {
                    name = data.manifest.alternate.find(e => /medium/g.test(e));
                    src = name ? alterpath + name : data.about + '/!/' + data.manifest.entrypoint;
                }
            } else {
                src = data.about + '/!/' + data.manifest.entrypoint;
            }
        } else {
            name = typeof data.manifest.alternate == 'object' ?
                            data.manifest.alternate.find(e => /thumb/g.test(e)) : '';
            src = name ? alterpath + name : data.manifest.customicon;
        }

    } else {
        if ('technical' in data.metadata && 'format' in data.metadata.technical &&
                (data.metadata.technical.format.match(/video/gi) ||
                data.metadata.technical.format.match(/audio/gi) ||
                data.metadata.technical.format.match(/image/gi))) {
            src = data.about + '/!/';
        } else {
            src = data.manifest.customicon;
        }
    }

    if (data.metadata.technical.format.match(/video/gi)) {
        $res = $('<video controls><source></source></video>');
        $res.find('source').attr('src', src).attr('type', data.metadata.technical.format);

    } else if (data.metadata.technical.format.match(/audio/gi)) {
        $res = $('<audio controls><source></source></audio>');
        $res.find('source').attr('src', src).attr('type', data.metadata.technical.format);

    } else {
        $res = $('<img />');
        $res.attr('src', src).attr('alt', data.metadata.general.title.none);
    }

    return $res.get(0).outerHTML;
};

/**
 * Return the OVA item HTML.
 *
 * @param {object} item The OVA item metadata.
 * @param {string} tpl The HTML base template.
 * @returns {string} The item HTML content.
 */
export const itemContent = (item, tpl = null) => {

    if (!tpl) {
        var $boatpl = $('#boa-tpl-item');
        if ($boatpl.length > 0) {
            tpl = $boatpl[0].innerHTML;
        } else {
            // Default simple template.
            tpl = [
                '<div class="boa-item">',
                '<div class="boa-thumb">',
                '<img src="{thumb}" alt="{title}" />',
                '</div>',
                '<div class="boa-content">',
                '<h3>{title}</h3>',
                '<p>{description}</p>',
                '<div class="boa-social">',
                '<span class="boa-comments">{comments}</span>',
                '<span class="boa-score">{score}</span>',
                '<span class="boa-views">{views}</span>',
                '</div>',
                '</div>',
                '</div>'
            ].join('');
        }
    }

    var content = tpl;
    var type = (item.metadata.technical && item.metadata.technical.format) ? item.metadata.technical.format : '';

    content = content.replace(/{thumb}/g, item.thumb);
    content = content.replace(/{title}/g, item.metadata.general.title.none);
    content = content.replace(/{about}/g, item.about);
    content = content.replace(/{description}/g, item.metadata.general.description.none);
    content = content.replace(/{comments}/g, item.social.comments);
    content = content.replace(/{score}/g, item.social.score.count ? item.social.score.sum + '/' + item.social.score.count : 0);
    content = content.replace(/{views}/g, item.social.views);
    content = content.replace(/{type}/g, type);

    return content;
};

/**
 * Define the OVA item preview image.
 *
 * @param {object} item
 * @returns
 */
export const choosePreview = (item) => {

    if ('alternate' in item.manifest && item.manifest.entrypoint) {

        var alternatebase;

        if (item.id.indexOf('/content/') >= 0) {
            alternatebase = item.id.substr(item.id.indexOf('/content/') + 9);
        } else {
            alternatebase = item.manifest.entrypoint;
        }

        var alterpath = item.about + '/!/.alternate/' + alternatebase;

        if (item.manifest.alternate.indexOf('preview.png') >= 0) {
            return alterpath + '/preview.png';
        } else if (item.manifest.alternate.indexOf('thumb.png') >= 0) {
            return alterpath + '/thumb.png';
        }
    }

    return item.about + '.img?s=128';
};

/**
 * Check if the OVA item is downloadable.
 *
 * @param {object} data The OVA item metadata.
 * @returns {boolean} True if the item is downloadable, false otherwise.
 */
export const isDownloadable = (data) => {
    // ToDo: validate by content type.
    return !data.manifest.conexion_type || data.manifest.conexion_type != 'external';
};

/**
 * Load strings from server.
 *
 * @param {array} strings The strings to load.
 *
 */
export const loadStrings = (strings) => {

    var s = {};

    strings.forEach(one => {
        s[one.key] = one.key;
    });

    getStrings(strings).then(function(results) {
        var pos = 0;
        strings.forEach(one => {
            s[one.key] = results[pos];
            pos++;
        });

        return true;
    }).fail(function(e) {
        Log.debug('Error loading strings');
        Log.debug(e);
    });

    return s;
};

export const showMessage = (text, type, info, $errorBox) => {
    type = type ? type : 'error';
    info = info ? info : '';

    if (type == 'error') {
        type = 'danger';
    }

    var content = [
        '<div class="alert alert-dismissible alert-' + type + '">',
        '<button type="button" class="close" data-dismiss="alert">&times;</button>',
        '<p>' + text + '</p>',
        '<div>' + info + '</div>',
        '</div>'
    ].join('');

    var $content = $(content);

    $content.find('button.close').on('click', function() {
        $content.remove();
    });

    if ($errorBox) {
        $errorBox.find('> .alert').remove();
        $errorBox.append($content);
        return true;
    }

    return $content;

};
