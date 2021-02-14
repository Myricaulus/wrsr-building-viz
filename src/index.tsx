import './index.css';
import * as serviceWorker from './serviceWorker';
import { OrbitControls } from './OrbitControls';
// ReactDOM.render(
//   <React.StrictMode>
//	 <App />
//   </React.StrictMode>,
//   document.getElementById('root')
// );

import * as THREE from 'three';

//import Stats from './jsm/libs/stats.module.js';

THREE.Cache.enabled = true;
//THREE.Loader.Handlers.add( /\.dds$/i, new THREE.DDSLoader() );

let camera = new THREE.PerspectiveCamera(30, (window.innerWidth / 2) / window.innerHeight, 1, 1500);
new OrbitControls(camera, document.getElementById("renderer"));
let renderer = new THREE.WebGLRenderer({ antialias: true });
const scene = new THREE.Scene();
let line_z = 0.01;
let increase_line_z = false;
let group = new THREE.Group();
let connection_space = 3;
let vehicle_space = 1.5;
let pedestrian_space = 1;

interface IMeshColor {
	Color: string;
}

enum MeshColors {
	SceneBackground = 0x002200,
	RoadDead = 0x111111,
	WorkerRenderingArea = 0x00a4a4,
	ResourceVisualization = 0x04f2dd,
	ConnectionRailAllowPass = 0x333333,
	ConnectionRoad = 0x555555,
	ConnectionFactory = 0xe8d400,
	ConnectionPedestrian = 0xdddddd,
	CostVehicleStation = 0xA0522D,
	VehicleStation = 0x777777,
	DetourPointsPid = 0xf1948a,
	DetourPoints = 0xe74c3c,
	VehiclePathAllowPass = 0x0000ff,
	VehiclePathEntrence = 0x00ff00,
	VehiclePathStation = 0xffa500,
	VehiclePathParking = 0xffff00,
	VehiclePathPID = 0xffffff,
	VehiclePathDetour = 0xaa00aa,
	VehiclePathExit = 0xff00ff,
	ConnectionConveyorInput = 0xffa500,
	ConnectionConveyorOutput = 0xaa7500,
	ConnectionBulkInput = 0xffffff,
	ConnectionBulkOutput = 0xaaaaaa,
}


init();
let loader = new THREE.TextureLoader();
loader.load('texture.png', function (texture) {
	let geometry = new THREE.SphereGeometry(1000, 20, 20);
	let material = new THREE.MeshBasicMaterial({ map: texture });
	let mesh = new THREE.Mesh(geometry, material);
	scene.add(mesh);
});
scene.add(group);
parseEditor();

animate();

function init() {
	// CAMERA

	camera.position.set(0, 0, 200);
	camera.lookAt(0, 0, 0);

	// SCENE
	scene.background = new THREE.Color(0x002200);

	// LIGHTS

	let dirLight = new THREE.DirectionalLight(0xffffff, 0.125);
	dirLight.position.set(0, 0, 1).normalize();
	scene.add(dirLight);

	let pointLight = new THREE.PointLight(0xffffff, 1.5);
	pointLight.position.set(0, 100, 90);
	scene.add(pointLight);

	// Renderer

	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth / 2, window.innerHeight);
	let container = document.getElementById("renderer");
	if (container != null) {
		container.appendChild(renderer.domElement);
		container.style.touchAction = 'none';
	}
	window.addEventListener('resize', onWindowResize, false);

}

function throttle(func: Function, interval: number) {
	let lastCall = 0;
	return function () {
		let now = Date.now();
		if (lastCall + interval < now) {
			lastCall = now;
			return func.apply(arguments);
		}
	};
}

document.getElementById("editor")?.addEventListener("keyup", throttle(parseEditor, 210));
document.getElementById("HamletYouMoron")?.addEventListener("click", ShowMeTheLight);
document.getElementById("LegendButton")?.addEventListener("click", ClickLegend);
let legend = document.getElementById("Legend");
if (legend) CreateLegend(legend);

function parseEditor() {
	group.children.length = 0;
	let content = (document.getElementById("editor") as HTMLTextAreaElement).value;
	if (!content)
		return;
	let contentParts = content.split("$");
	let vehicle_stations_turning_points: Array<Array<number>> = [];
	let vehicle_stations: Array<Array<number>> = [];
	let vp: Array<Array<number>> = [];
	let vp_turning_points: Array<Array<number>> = [];
	let entrence_points: Array<Array<number>> = [];
	let exit_points: Array<Array<number>> = [];
	let road_entrence_points_ap: Array<Array<number>> = [];
	let road_exit_points_ap: Array<Array<number>> = [];
	let detour_points: Array<Array<number>> = []; // Without PID
	let detour_points_pid: Array<Array<number>> = [];
	let vp_advanced_point: Array<Array<number>> = [];
	let vp_advanced_point_pid: Array<Array<number>> = [];
	let station_not_block = false;
	let road_allow_pass_found = false;
	line_z = 0.2;

	for (let index = 0; index < contentParts.length; index++) {
		let node = contentParts[index];
		// CONNECTIONS_ROAD_DEAD_SQUARE
		let res_viz = node.match(/CONNECTIONS_ROAD_DEAD_SQUARE\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+/i)
		if (res_viz) {
			let x1 = +res_viz[1];
			let y1 = +res_viz[2];
			let x2 = +res_viz[3];
			let y2 = +res_viz[4];

			let planeGeo;
			if (x1 === x2) {
				planeGeo = drawSquare(x1 - connection_space, y1, x1 + connection_space, y2);
			}
			else if (y1 === y2) {
				planeGeo = drawSquare(x1, y1 - connection_space, x2, y2 + connection_space);
			}
			else {
				planeGeo = drawSquare(x1, y1, x2, y2);
			}
			let planematerial = new THREE.MeshBasicMaterial({ color: MeshColors.RoadDead, side: THREE.DoubleSide });
			let plane = new THREE.Mesh(planeGeo, planematerial);
			plane.position.z = -0.1;
			group.add(plane);
		}
		// WORKER_RENDERING_AREA
		res_viz = node.match(/^WORKER_RENDERING_AREA\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i)
		if (res_viz) {
			let x1 = +res_viz[1];
			let y1 = +res_viz[2];
			let x2 = +res_viz[3];
			let y2 = +res_viz[4];

			let planeGeo;
			if (x1 === x2) {
				planeGeo = drawSquare(x1 - connection_space, y1, x1 + connection_space, y2);
			}
			else if (y1 === y2) {
				planeGeo = drawSquare(x1, y1 - connection_space, x2, y2 + connection_space);
			}
			else {
				planeGeo = drawSquare(x1, y1, x2, y2);
			}
			let planematerial = new THREE.MeshBasicMaterial({ color: MeshColors.WorkerRenderingArea, side: THREE.DoubleSide });
			let plane = new THREE.Mesh(planeGeo, planematerial);
			group.add(plane);
		}

		// RESOURCE_VISUALIZATION
		res_viz = node.match(/RESOURCE_VISUALIZATION\s+[-\d.]+\s+position\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+rotation\s[-\d.]+\sscale\s([-\d.]+)\s([-\d.]+)\s([-\d.]+)\snumstepx\s[-\d.]+\s[-\d.]+\snumstept\s[-\d.]+\s[-\d.]+/i)
		if (res_viz) {
			let planeGeo = new THREE.PlaneBufferGeometry(+(res_viz[4]), +(res_viz[6]), 1, 1);
			let planematerial = new THREE.MeshBasicMaterial({ color: MeshColors.ResourceVisualization, side: THREE.DoubleSide });
			let plane = new THREE.Mesh(planeGeo, planematerial);
			plane.position.x = +(res_viz[1]);
			plane.position.y = +(res_viz[3]);

			group.add(plane);
		}
		// CONNECTION_RAIL_ALLOWPASS
		res_viz = node.match(/CONNECTION_RAIL_ALLOWPASS\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i);
		if (res_viz) {
			let x1 = +res_viz[1];
			let y1 = +res_viz[2];
			let res_viz_2 = contentParts[index + 1].match(/CONNECTION_RAIL_ALLOWPASS\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i);
			if (res_viz_2) {
				let x2 = +res_viz_2[1];
				let y2 = +res_viz_2[2];
				let planeGeo;
				if (x1 === x2) {
					planeGeo = drawSquare(x1 - connection_space, y1, x1 + connection_space, y2);
				}
				else if (y1 === y2) {
					planeGeo = drawSquare(x1, y1 - connection_space, x2, y2 + connection_space);
				}
				else {
					planeGeo = drawSquare(x1, y1, x2, y2);
				}

				let planematerial = new THREE.MeshBasicMaterial({ color: MeshColors.ConnectionRailAllowPass, side: THREE.DoubleSide });
				let plane = new THREE.Mesh(planeGeo, planematerial);
				index++;
				group.add(plane);
			}
		}
		// CONNECTION_ROAD_DEAD
		res_viz = node.match(/CONNECTION_ROAD_DEAD\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i);
		if (res_viz) {
			let x1 = +res_viz[1];
			let y1 = +res_viz[2];
			let res_viz_2 = contentParts[index + 1].match(/CONNECTION_ROAD_DEAD\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i);
			if (res_viz_2) {
				let x2 = +res_viz_2[1];
				let y2 = +res_viz_2[2];
				let planeGeo;
				if (x1 === x2) {
					planeGeo = drawSquare(x1 - connection_space, y1, x1 + connection_space, y2);
				}
				else if (y1 === y2) {
					planeGeo = drawSquare(x1, y1 - connection_space, x2, y2 + connection_space);
				}
				else {
					planeGeo = drawSquare(x1, y1, x2, y2);
				}

				let planematerial = new THREE.MeshBasicMaterial({ color: MeshColors.RoadDead, side: THREE.DoubleSide });
				let plane = new THREE.Mesh(planeGeo, planematerial);
				plane.position.z = -0.01;
				index++;
				group.add(plane);
			}
		}
		// CONNECTION_ROAD_* non dead

		res_viz = node.match(/CONNECTION_ROAD(_ALLOWPASS|_INPUT|_OUTPUT|)\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i);
		if (res_viz) {
			let x1 = +res_viz[2];
			let y1 = +res_viz[3];
			let x2 = +res_viz[4];
			let y2 = +res_viz[5];
			switch (res_viz[1]) {
				case "_ALLOWPASS":
					if (!road_allow_pass_found) {
						road_entrence_points_ap.push([x1, y1]);
						road_allow_pass_found = true;
					}
					else {
						road_exit_points_ap.push([x1, y1]);
						road_allow_pass_found = false;
					}
					break;
				case "":
					entrence_points.push([x1, y1]);
					exit_points.push([x1, y1]);
					break;
				case "_INPUT":
					entrence_points.push([x1, y1]);
					break;
				case "_OUTPUT":
					exit_points.push([x1, y1]);
					break;
				default:
					break;
			}
			let planeGeo;
			if (x1 === x2) {
				planeGeo = drawSquare(x1 - connection_space, y1, x1 + connection_space, y2);
			}
			else if (y1 === y2) {
				planeGeo = drawSquare(x1, y1 - connection_space, x2, y2 + connection_space);
			}
			else {
				planeGeo = drawSquare(x1, y1, x2, y2);
			}

			let planematerial = new THREE.MeshBasicMaterial({ color: MeshColors.ConnectionRoad, side: THREE.DoubleSide });
			let plane = new THREE.Mesh(planeGeo, planematerial);
			plane.position.z = 0.1;
			group.add(plane);
		}
		// CONNECTION_CONNECTION
		res_viz = node.match(/^CONNECTION_CONNECTION\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i)
		if (res_viz) {
			let x1 = +res_viz[1];
			let y1 = +res_viz[2];
			let x2 = +res_viz[3];
			let y2 = +res_viz[4];

			let planeGeo;
			if (x1 === x2) {
				planeGeo = drawSquare(x1 - connection_space, y1, x1 + connection_space, y2);
			}
			else if (y1 === y2) {
				planeGeo = drawSquare(x1, y1 - connection_space, x2, y2 + connection_space);
			}
			else {
				planeGeo = drawSquare(x1, y1, x2, y2);
			}
			let planematerial = new THREE.MeshBasicMaterial({ color: MeshColors.ConnectionFactory, side: THREE.DoubleSide });
			let plane = new THREE.Mesh(planeGeo, planematerial);
			group.add(plane);
		}
		// CONNECTION_CONVEYOR
		res_viz = node.match(/^CONNECTION_CONVEYOR(_INPUT|_OUTPUT)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+/i)
		if (res_viz) {
			let x1 = +res_viz[2];
			let z1 = +res_viz[3];
			let y1 = +res_viz[4];
			let x2 = +res_viz[5];
			//let z2 = +res_viz[5];
			let y2 = +res_viz[7];
			let convColor = MeshColors.ConnectionConveyorInput;
			switch (res_viz[1]) {
				case "_INPUT":
					convColor = MeshColors.ConnectionConveyorInput;
					break;
				case "_OUTPUT":
					convColor = MeshColors.ConnectionConveyorOutput;
					break;
				default:
					break;
			}
			let planeGeo;
			if (x1 === x2) {
				planeGeo = drawSquare(x1 - connection_space, y1, x1 + connection_space, y2);
			}
			else if (y1 === y2) {
				planeGeo = drawSquare(x1, y1 - connection_space, x2, y2 + connection_space);
			}
			else {
				planeGeo = drawSquare(x1, y1, x2, y2);
			}
			let planematerial = new THREE.MeshBasicMaterial({ color: convColor, side: THREE.DoubleSide });
			let plane = new THREE.Mesh(planeGeo, planematerial);
			plane.position.z = z1;
			group.add(plane);
		}
		// CONNECTION_BULK
		res_viz = node.match(/^CONNECTION_BULK(_INPUT|_OUTPUT)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+/i)
		if (res_viz) {
			let x1 = +res_viz[2];
			let z1 = +res_viz[3];
			let y1 = +res_viz[4];
			let x2 = +res_viz[5];
			//let z2 = +res_viz[5];
			let y2 = +res_viz[7];
			let convColor = MeshColors.ConnectionBulkInput;
			switch (res_viz[1]) {
				case "_INPUT":
					convColor = MeshColors.ConnectionBulkInput;
					break;
				case "_OUTPUT":
					convColor = MeshColors.ConnectionBulkOutput;
					break;
				default:
					break;
			}
			let planeGeo;
			if (x1 === x2) {
				planeGeo = drawSquare(x1 - connection_space, y1, x1 + connection_space, y2);
			}
			else if (y1 === y2) {
				planeGeo = drawSquare(x1, y1 - connection_space, x2, y2 + connection_space);
			}
			else {
				planeGeo = drawSquare(x1, y1, x2, y2);
			}
			let planematerial = new THREE.MeshBasicMaterial({ color: convColor, side: THREE.DoubleSide });
			let plane = new THREE.Mesh(planeGeo, planematerial);
			plane.position.z = z1;
			group.add(plane);
		}
		// CONNECTION_PEDESTRIAN
		res_viz = node.match(/^CONNECTION_PEDESTRIAN\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i)
		if (res_viz) {
			let x1 = +res_viz[1];
			let y1 = +res_viz[2];
			let x2 = +res_viz[3];
			let y2 = +res_viz[4];

			let planeGeo;
			if (x1 === x2) {
				planeGeo = drawSquare(x1 - pedestrian_space, y1, x1 + pedestrian_space, y2);
			}
			else if (y1 === y2) {
				planeGeo = drawSquare(x1, y1 - pedestrian_space, x2, y2 + pedestrian_space);
			}
			else {
				planeGeo = drawSquare(x1, y1, x2, y2);
			}
			let planematerial = new THREE.MeshBasicMaterial({ color: MeshColors.ConnectionPedestrian, side: THREE.DoubleSide });
			let plane = new THREE.Mesh(planeGeo, planematerial);
			group.add(plane);
		}
		// VEHICLE_STATION
		res_viz = node.match(/VEHICLE_STATION\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i)
		if (res_viz) {
			let x1 = +res_viz[1];
			let y1 = +res_viz[2];
			let x2 = +res_viz[3];
			let y2 = +res_viz[4];


			let planeGeo;
			if (x1 === x2) {
				planeGeo = drawSquare(x1 - vehicle_space, y1, x1 + vehicle_space, y2);
			}
			else if (y1 === y2) {
				planeGeo = drawSquare(x1, y1 - vehicle_space, x2, y2 + vehicle_space);
			}
			else {
				planeGeo = drawSquare(x1, y1, x2, y2);
			}
			let planematerial;
			if (node.startsWith("COST"))
				planematerial = new THREE.MeshBasicMaterial({ color: MeshColors.CostVehicleStation, side: THREE.DoubleSide });
			else {
				planematerial = new THREE.MeshBasicMaterial({ color: MeshColors.VehicleStation, side: THREE.DoubleSide });
				vehicle_stations.push([x1, y1]);
				vehicle_stations_turning_points.push([x2, y2]);
			}
			let plane = new THREE.Mesh(planeGeo, planematerial);
			group.add(plane);
		}
		// VEHICLE_PARKING 
		res_viz = node.match(/VEHICLE_PARKING\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i)
		if (res_viz) {
			let x1 = +res_viz[1];
			let y1 = +res_viz[2];
			let x2 = +res_viz[3];
			let y2 = +res_viz[4];

			let planeGeo;
			if (x1 === x2) {
				planeGeo = drawSquare(x1 - vehicle_space, y1, x1 + vehicle_space, y2);
			}
			else if (y1 === y2) {
				planeGeo = drawSquare(x1, y1 - vehicle_space, x2, y2 + vehicle_space);
			}
			else {
				planeGeo = drawSquare(x1, y1, x2, y2);
			}
			let planematerial;

			planematerial = new THREE.MeshBasicMaterial({ color: MeshColors.VehicleStation, side: THREE.DoubleSide });
			vp.push([x1, y1]);
			vp_turning_points.push([x2, y2]);

			let plane = new THREE.Mesh(planeGeo, planematerial);
			group.add(plane);
		}
		res_viz = node.match(/STATION_NOT_BLOCK_DETOUR_POINT_PID\s+([-\d.]+)\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i);
		if (res_viz) {
			detour_points_pid.push([+res_viz[2], +res_viz[3], +res_viz[1]]);
			let geometry = new THREE.CircleGeometry(0.5);
			let material = new THREE.MeshBasicMaterial({ color: MeshColors.DetourPointsPid });
			let circle = new THREE.Mesh(geometry, material);
			circle.position.x = +res_viz[2];
			circle.position.y = +res_viz[3];
			group.add(circle);
		}
		res_viz = node.match(/VEHICLE_PARKING_ADVANCED_POINT_PID\s+([-\d.]+)\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i);
		if (res_viz) {
			vp_advanced_point_pid.push([+res_viz[2], +res_viz[3], +res_viz[1]]);
			let geometry = new THREE.CircleGeometry(0.5);
			let material = new THREE.MeshBasicMaterial({ color: MeshColors.DetourPointsPid });
			let circle = new THREE.Mesh(geometry, material);
			circle.position.x = +res_viz[2];
			circle.position.y = +res_viz[3];
			group.add(circle);
		}
		res_viz = node.match(/STATION_NOT_BLOCK\s+/i);
		if (res_viz) {
			station_not_block = true;
		}
		res_viz = node.match(/STATION_NOT_BLOCK_DETOUR_POINT\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i);
		if (res_viz) {
			detour_points.push([+res_viz[1], +res_viz[2]])
			let geometry = new THREE.CircleGeometry(0.5);
			let material = new THREE.MeshBasicMaterial({ color: MeshColors.DetourPoints });
			let circle = new THREE.Mesh(geometry, material);
			circle.position.x = +res_viz[1];
			circle.position.y = +res_viz[2];
			group.add(circle);
		}
		res_viz = node.match(/VEHICLE_PARKING_ADVANCED_POINT\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i);
		if (res_viz) {
			let point = [+res_viz[1], +res_viz[2]];
			if (!vp_advanced_point.some(arr => arraysEqual(arr, point)))
				vp_advanced_point.push(point)
			let geometry = new THREE.CircleGeometry(0.5);
			let material = new THREE.MeshBasicMaterial({ color: MeshColors.DetourPoints });
			let circle = new THREE.Mesh(geometry, material);
			circle.position.x = +res_viz[1];
			circle.position.y = +res_viz[2];
			group.add(circle);
		}
	}
	// Allowpass paths
	drawLinesOneToOne(road_entrence_points_ap, road_exit_points_ap, new THREE.LineBasicMaterial({ color: MeshColors.VehiclePathAllowPass }))
	// Paths for stations
	drawLinesOneToOne(vehicle_stations_turning_points, vehicle_stations, new THREE.LineBasicMaterial({ color: MeshColors.VehiclePathStation }));
	if (station_not_block) {
		drawLines(entrence_points, vehicle_stations_turning_points, new THREE.LineBasicMaterial({ color: MeshColors.VehiclePathEntrence }));
		drawLinesWithPIDinEnds(vehicle_stations, detour_points_pid, new THREE.LineBasicMaterial({ color: MeshColors.VehiclePathPID }));
		if (detour_points.length) {
			if (!detour_points_pid.length)
				detour_points_pid = vehicle_stations;
			drawDPLines(detour_points_pid, detour_points, exit_points, new THREE.LineBasicMaterial({ color: MeshColors.VehiclePathDetour }));
		} else {
			if (detour_points_pid.length)
				drawLines(detour_points_pid, exit_points, new THREE.LineBasicMaterial({ color: MeshColors.VehiclePathExit }));
			else
				drawLines(vehicle_stations, exit_points, new THREE.LineBasicMaterial({ color: MeshColors.VehiclePathExit }));

		}
	} else
		drawLines(vehicle_stations_turning_points, exit_points, new THREE.LineBasicMaterial({ color: MeshColors.VehiclePathExit }));

	// Path for parking; no entrence path since its the same way in then out currently
	drawLinesOneToOne(vp_turning_points, vp, new THREE.LineBasicMaterial({ color: MeshColors.VehiclePathParking }));
	if (true) {
		if (!vp_advanced_point_pid.length)
			vp_advanced_point_pid = vp_turning_points;
		else
			drawLinesWithPIDinEnds(vp_turning_points, vp_advanced_point_pid, new THREE.LineBasicMaterial({ color: MeshColors.VehiclePathExit }));
		if (vp_advanced_point.length) {
			drawDPLines(vp_advanced_point_pid, vp_advanced_point, exit_points, new THREE.LineBasicMaterial({ color: MeshColors.VehiclePathDetour }));
		} else {
			drawLines(vp_turning_points, exit_points, new THREE.LineBasicMaterial({ color: MeshColors.VehiclePathExit }));
		}
	}
}

function drawDPLines(starts: any[], dps: any[], ends: any[], material: THREE.LineBasicMaterial) {
	starts.forEach(from_p => {
		let points = [];
		points.push(new THREE.Vector3(from_p[0], from_p[1], line_z));
		points.push(new THREE.Vector3(dps[0][0], dps[0][1], line_z));
		if (increase_line_z)
			line_z++
		let geometry = new THREE.BufferGeometry().setFromPoints(points);
		let line = new THREE.Line(geometry, material);
		group.add(line);
	});
	for (let index = 0; index < dps.length - 1; index++) {
		let points = [];
		points.push(new THREE.Vector3(dps[index][0], dps[index][1], line_z));
		points.push(new THREE.Vector3(dps[index + 1][0], dps[index + 1][1], line_z));
		if (increase_line_z)
			line_z++
		let geometry = new THREE.BufferGeometry().setFromPoints(points);
		let line = new THREE.Line(geometry, material);
		group.add(line);
	}
	ends.forEach(en_p => {
		let points = [];
		points.push(new THREE.Vector3(en_p[0], en_p[1], line_z));
		points.push(new THREE.Vector3(dps[dps.length - 1][0], dps[dps.length - 1][1], line_z));
		if (increase_line_z)
			line_z++
		let geometry = new THREE.BufferGeometry().setFromPoints(points);
		let line = new THREE.Line(geometry, material);
		group.add(line);
	});

}
function drawLines(starts: any[], ends: any[], material: THREE.LineBasicMaterial) {
	starts.forEach(en_p => {
		ends.forEach(tu_p => {
			let points = [];
			points.push(new THREE.Vector3(en_p[0], en_p[1], line_z));
			points.push(new THREE.Vector3(tu_p[0], tu_p[1], line_z));
			if (increase_line_z)
				line_z++
			let geometry = new THREE.BufferGeometry().setFromPoints(points);

			let line = new THREE.Line(geometry, material);
			group.add(line);
		});
	});
}

function drawLinesOneToOne(starts: any[], ends: any[], material: THREE.LineBasicMaterial) {
	for (let index = 0; index < starts.length; index++) {
		let points = [];
		points.push(new THREE.Vector3(starts[index][0], starts[index][1], line_z));
		points.push(new THREE.Vector3(ends[index][0], ends[index][1], line_z));
		let geometry = new THREE.BufferGeometry().setFromPoints(points);
		if (increase_line_z)
			line_z++
		let line = new THREE.Line(geometry, material);
		group.add(line);
	}
}

function drawLinesWithPIDinEnds(starts: any[], ends: any[], material: THREE.LineBasicMaterial) {
	for (let index = 0; index < ends.length; index++) {
		const start_index = ends[index][2];
		let points = [];
		try {
			points.push(new THREE.Vector3(starts[start_index][0], starts[start_index][1], line_z));
			points.push(new THREE.Vector3(ends[index][0], ends[index][1], line_z));
			let geometry = new THREE.BufferGeometry().setFromPoints(points);
			if (increase_line_z)
				line_z++
			let line = new THREE.Line(geometry, material);
			group.add(line);
		} catch (error) {
			let bla = ""
		}
	}
}



function drawSquare(x1: number, y1: number, x2: number, y2: number) {

	let square = new THREE.Geometry();
	square.vertices.push(new THREE.Vector3(x1, y1, 0));
	square.vertices.push(new THREE.Vector3(x1, y2, 0));
	square.vertices.push(new THREE.Vector3(x2, y1, 0));
	square.vertices.push(new THREE.Vector3(x2, y2, 0));

	square.faces.push(new THREE.Face3(0, 1, 2));
	square.faces.push(new THREE.Face3(1, 2, 3));
	return square;
}

function arraysEqual(arr1: Array<Number>, arr2: Array<Number>) {
	if (arr1.length !== arr2.length)
		return false;
	for (let i = arr1.length; i--;) {
		if (arr1[i] !== arr2[i])
			return false;
	}

	return true;
}

function enumKeys<O extends object, K extends keyof O = keyof O>(obj: O): K[] {
	return Object.keys(obj).filter(k => Number.isNaN(+k)) as K[];
}

function onWindowResize() {
	camera.aspect = window.innerWidth / 2 / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth / 2, window.innerHeight);
}

function animate() {
	requestAnimationFrame(animate);
	render();
}

function render() {
	renderer.clear();
	renderer.render(scene, camera);

}

function ShowMeTheLight(hamlet: Event) {
	let item = document.getElementById("MenuButtons") as HTMLSpanElement;
	let style = window.getComputedStyle(item);
	if (style.display === "none") {
		item.style.display = "block";
	} else {
		item.style.display = "none";
	}
}

function ClickLegend(LegendButton: Event) {
	let item = document.getElementById("Legend") as HTMLElement;
	let style = window.getComputedStyle(item);
	if (style.display === "none")
		item.style.display = "block";
	else
		item.style.display = "none";
}

function CreateLegend(root: HTMLElement) {
	let index = 0;
	for (let value of enumKeys(MeshColors)) {
		let ColorEntry = document.createElement('div') as HTMLDivElement;
		if (index % 2)
			ColorEntry.className = "ColorOdd";
		else
			ColorEntry.className = "ColorEven";

		let ColorBox = document.createElement('span') as HTMLSpanElement;
		ColorBox.className = "ColorBox";
		ColorBox.setAttribute("style", "background-color:#" + ("000000" + MeshColors[value].toString(16)).substr(-6, 6));
		let ColorText = document.createElement('span') as HTMLSpanElement;
		ColorText.textContent = value;
		ColorText.className = "ColorText";

		ColorEntry.appendChild(ColorBox);
		ColorEntry.appendChild(ColorText);
		root.appendChild(ColorEntry);
		index++;
	}
}

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
