<?php
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
 * Class containing renderers for the module.
 *
 * @package    mod_boa
 * @copyright  2024 David Herney @ BambuCo
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
namespace mod_boa\output;

use renderable;
use renderer_base;
use templatable;

/**
 * Class containing data for the module.
 *
 * @copyright  2024 David Herney @ BambuCo
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class content implements renderable, templatable {

    /**
     * @var object $moduleinstance The module instance.
     */
    private $moduleinstance;

    /**
     * Constructor.
     *
     * @param object $moduleinstance The module instance.
     */
    public function __construct(object $moduleinstance) {
        $this->moduleinstance = $moduleinstance;
    }

    /**
     * Export this data so it can be used as the context for a mustache template.
     *
     * @param \renderer_base $output
     * @return array Context variables for the template
     */
    public function export_for_template(renderer_base $output) {
        global $OUTPUT, $PAGE;

        $networks = get_config('mod_boa', 'networks');

        $networkslist = explode("\n", $networks);

        $socialnetworks = [];
        foreach ($networkslist as $one) {

            $row = explode('|', $one);

            if (count($row) >= 2) {
                $network = new \stdClass();
                $network->icon = trim($row[0]);
                $network->url = trim($row[1]);
                $socialnetworks[] = $network;
            }

        }

        $id = 'mod_boa_' . time();

        $defaultvariables = [
            'loadingimg' => $OUTPUT->pix_icon('i/loading', get_string('loadinghelp')),
            'blockid' => $id,
            'socialnetworks' => $socialnetworks,
        ];

        $uris = explode("\n", $this->moduleinstance->resources);
        $uris = array_map('trim', $uris);
        $uris = array_filter($uris);

        $config = get_config('mod_boa');
        $repositories = explode("\n", $config->repositories);
        $repositories = array_map('trim', $repositories);
        $repositories = array_filter($repositories);
        $PAGE->requires->js_call_amd('mod_boa/content', 'init', [$uris]);

        return $defaultvariables;
    }
}
