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
 * To display the content of the module.
 *
 * @module     mod_boa/content
 * @copyright  2024 David Herney @ BambuCo
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import $ from 'jquery';
import Log from 'core/log';
import * as BoAUtil from 'mod_boa/util';

// Global variables.
var $contentplay;
var $contentplaybody;
var $contentplaytitle;
var $contentlist;

// Private functions.

var binditem = function($item) {
    $item.on('click', function() {
        var $thisitem = $(this);

        if ($thisitem.hasClass('boa-content-active')) {
            return;
        }

        var data = $item.data('data');
        $contentplaybody.children().hide();

        var $existicontent = $contentplaybody.find('[data-idresource="' + data.id + '"]');
        if ($existicontent.length > 0) {
            $existicontent.show();
        } else {
            var maincontent = BoAUtil.chooseView(data);
            var $maincontent = $('<div>' + maincontent + '</div>');
            $maincontent.attr('data-idresource', data.id);
            $contentplaybody.append($maincontent);

            // ToDo: The next code has problem with cross-domain. We need to find a solution.
            /*if ($maincontent.children().first().is('iframe')) {
                var iframe = $maincontent.children().first()[0];
                // Adjusting the iframe height onload event.
                iframe.onload = function() {
                    iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 'px';
                    iframe.style.width = iframe.contentWindow.document.body.scrollWidth + 'px';
                };
            }*/
        }

        $contentplaytitle.html(data.metadata.general.title.none);
        $contentlist.find('.boa-content-active').removeClass('boa-content-active');
        $thisitem.addClass('boa-content-active');

    });
};

/**
 * Component initialization.
 *
 * @param {array} uris The resource URIs. In order to load the content.
 */
export const init = (uris) => {

    $contentplay = $('#boa-contentplay');
    $contentplaybody = $contentplay.find('> div');
    $contentplaytitle = $contentplay.find('> h2');
    $contentlist = $('#boa-contentlist');

    $.each(uris, function(index, uri) {

        $.get(uri, [], function(data) {
            let $content = $('<div></div>');

            if (typeof data === 'object' && data.error) {
                let msg = BoAUtil.showMessage(data.error);
                $content.append(msg);
            } else {
                data.thumb = BoAUtil.choosePreview(data);
                $content = $(BoAUtil.itemContent(data));
                $content.data('data', data);
                binditem($content);
            }

            $contentlist.append($content);

            if (index === 0) {
                $content.trigger('click');
            }
        })
        .fail(function() {
            Log.error('Error loading the content: ' + uri);
        });

    });

};
