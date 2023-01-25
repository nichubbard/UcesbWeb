/*
 * Graphics configuration for Experiment S452 (March 2021)
 * Used to generate scaler part of HTML allowing quick changes
 */

var fatima_scalers =
[
    [ "bPlast Free" 		, 0 ],
    [ "bPlast Accepted" 	, 1 ],
	
	[ "bPlast Up"			, 8 ],
	[ "bPlast Down"			, 9 ],
	
	[ "bPlast Up&Down"		, 10],
	[ "Pulser"				, 15],

    [ "FATIMA TAMEX Free"     	, 2 ],
    [ "FATIMA TAMEX Accepted" 	, 3 ],

    [ "FATIMA VME Free" 	, 4 ],
    [ "FATIMA VME Accepted" 	, 5 ],

    [ "HPGe Free" 		, 6 ],
    [ "HPGe Accepted" 		, 7 ],
	
	[ "SCI41 L",			11 ],
	[ "SCI41 R",			12 ],
	
	[ "SCI42 L",			13 ],
	[ "SCI42 R",			14 ],
];

var frs_scalers =
[
    [ "FRS Free"		, 32 ],
    [ "FRS Accepted"		, 33 ],
    [ "Start Extr."		,  8 ],
    [ "Stop  Extr."		,  9],
    [ "SIS"             , 10],
    [ "SEETRAM"         ,  2],
	[ "SCI21L"			, 48],
	[ "SCI21R"			, 53],
	[ "SCI22L"			, 61],
	[ "SCI22R"			, 62],
	[ "SCI41L"			, 49],
	[ "SCI41R"			, 54],
	[ "SCI42L"			, 50],
	[ "SCI42R"			, 55],
];

SEETRAM_A =  238;          // Beam A
SEETRAM_Z =   92;          // Beam Z
SEETRAM_E = 1000;          // Beam E 
SEETRAM_R = 10 * 1.0E-9;  // 1 nA full scale range
SEETRAM_C =   35;          // FRS scaler containing a 1 Hz clock for SEETRAM
SEETRAM_0 =  154;          // approximate Hz for 0 nA in SEETRAM
