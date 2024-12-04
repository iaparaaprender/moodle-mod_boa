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

namespace mod_boa\local;

/**
 * Class controller
 *
 * @package    mod_boa
 * @copyright  2024 David Herney @ BambuCo
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class controller {

    /**
     * Get available repositories
     *
     * @return array
     */
    public static function get_repositories() {
        $parameter = get_config('mod_boa', 'repositories');
        $parameterlist = explode("\n", $parameter);

        $repositories = [];
        foreach ($parameterlist as $index => $line) {
            $line = trim($line);

            if (empty($line)) {
                continue;
            }

            $parts = explode(';', $line);
            if (count($parts) > 1) {
                $key = trim($parts[1]);
            } else if (preg_match('/\/c\/([^\/]+)/', $parts[0], $matches)) {
                $key = $matches[1];
            } else {
                $key = $parts[0];
            }
            $repositories[] = (object)['index' => $index, 'name' => $key, 'uri' => trim($parts[0])];
        }

        return $repositories;
    }
}
