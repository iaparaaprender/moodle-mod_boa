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
 * Structure step to restore one Resource from object bank activity
 *
 * @package    mod_boa
 * @copyright  2024 David Herney @ BambuCo
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class restore_boa_activity_structure_step extends restore_activity_structure_step {

    /**
     * Structure step to restore one boa activity
     *
     * @return array
     */
    protected function define_structure() {

        $paths = [];
        $paths[] = new restore_path_element('boa', '/activity/boa');

        // Return the paths wrapped into standard activity structure.
        return $this->prepare_activity_structure($paths);
    }

    /**
     * Process a boa restore
     *
     * @param array $data
     * @return void
     */
    protected function process_boa($data) {
        global $DB;

        $data = (object)$data;
        $oldid = $data->id;
        $data->course = $this->get_courseid();

        // Insert the boa record.
        $newitemid = $DB->insert_record('boa', $data);
        // Immediately after inserting "activity" record, call this.
        $this->apply_activity_instance($newitemid);
    }

    /**
     * Actions to be executed after the restore is completed
     */
    protected function after_execute() {
        // Add boa related files, no need to match by itemname (just internally handled context).
        $this->add_related_files('mod_boa', 'intro', null);
    }
}