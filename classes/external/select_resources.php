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

declare(strict_types=1);

namespace mod_boa\external;

use external_api;
use external_function_parameters;
use external_value;
use external_multiple_structure;
use invalid_parameter_exception;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/externallib.php');

/**
 * Class select_resources
 *
 * @package    mod_boa
 * @copyright  2024 David Herney @ BambuCo
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class select_resources extends external_api {

    /**
     * Returns description of method parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters(
            [
                'cmid' => new external_value(PARAM_INT, 'Course module instance id', VALUE_REQUIRED),
                'list' => new external_multiple_structure(
                    new external_value(PARAM_TEXT, 'Resource URL'),
                    'List of filters to search the courses', VALUE_DEFAULT, []
                ),
            ]
        );
    }

    /**
     * Save the resource list.
     *
     * @param int $cmid Course module instance id
     * @param array $list List of resources URL
     * @return bool
     */
    public static function execute(int $cmid, array $list): bool {
        global $DB;

        $params = self::validate_parameters(self::execute_parameters(), ['cmid' => $cmid, 'list' => $list]);

        $cm = get_coursemodule_from_id('boa', $params['cmid'], 0, false, MUST_EXIST);
        $context = \context_module::instance($cm->id);
        self::validate_context($context);
        require_capability('mod/boa:addinstance', $context);

        $aboutlist = [];
        foreach ($params['list'] as $about) {
            $about = trim($about);
            if (empty($about)) {
                throw new invalid_parameter_exception('Invalid resource URL');
            }

            $aboutlist[] = $about;
        }

        $data = [
            'id' => $cm->instance,
            'resources' => implode("\n", $aboutlist),
            'timemodified' => time(),
        ];

        // Trigger the resources_updated event.
        $event = \mod_boa\event\resources_updated::create([
            'context' => $context,
            'objectid' => $cm->instance,
            'other' => [
                'resources' => $aboutlist,
            ],
        ]);
        $event->trigger();

        return $DB->update_record('boa', $data);

    }

    /**
     * Returns description of method result value.
     *
     * @return external_value
     */
    public static function execute_returns(): external_value {
        return new external_value(PARAM_BOOL, 'True if the resource list was saved');
    }

}
