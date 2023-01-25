/*
 * Graphics configuration for Experiment S450 (May 2022)
 * Used to generate scaler part of HTML allowing quick changes
 */

var fatima_scalers =
[
    [ "bPlast Free" 		, 0 ],
    [ "bPlast Accepted" 	, 1 ],
	
	[ "bPlast Up"			, 6 ],
	[ "bPlast Down"			, 7 ],
	
	[ "bPlast Up&Down"		, 8],
	[ "10Hz"				, 13],

    [ "HPGe Free" 			, 3 ],
    [ "HPGe Accepted" 		, 4 ],
	
	[ "BGO"					, 5 ],
	[ null,					null ],
	
	[ "SCI41 L",			9 ],
	[ "SCI41 R",			10 ],
	
	[ "SCI21 L",			11 ],
	[ "SCI21 R",			12 ],
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

SEETRAM_A =  208;          // Beam A
SEETRAM_Z =   82;          // Beam Z
SEETRAM_E = 1000;          // Beam E 
SEETRAM_R = 10 * 1.0E-9;  // 10 nA full scale range
SEETRAM_C =   35;          // FRS scaler containing a 1 Hz clock for SEETRAM
SEETRAM_0 =  150;          // approximate Hz for 0 nA in SEETRAM
