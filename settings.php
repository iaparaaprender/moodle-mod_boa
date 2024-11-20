<?php
//
// This is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Settings for the module
 *
 * @package    mod_boa
 * @copyright  2024 David Herney @ BambuCo
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die;

if ($ADMIN->fulltree) {

    // Repositories.
    $name = 'mod_boa/repositories';
    $title = get_string('repositories', 'mod_boa');
    $help = get_string('repositories_help', 'mod_boa');
    $default = '';
    $setting = new admin_setting_configtextarea($name, $title, $help, $default);
    $settings->add($setting);

    // Repositories.
    $name = 'mod_boa/pagesize';
    $title = get_string('pagesize', 'mod_boa');
    $help = get_string('pagesize_help', 'mod_boa');
    $default = '10';
    $setting = new admin_setting_configtext($name, $title, $help, $default, PARAM_INT, 5);
    $settings->add($setting);

    // Social networks.
    $name = 'mod_boa/networks';
    $title = get_string('socialnetworks', 'mod_boa');
    $help = get_string('socialnetworks_help', 'mod_boa');
    $default = 'facebook|https://www.facebook.com/sharer/sharer.php?u={url}&t={name}
twitter|https://twitter.com/intent/tweet?source={url}&text={name}
pinterest|https://pinterest.com/pin/create/button/?url={url}&description={name}';
    $setting = new admin_setting_configtextarea($name, $title, $help, $default);
    $settings->add($setting);

}
