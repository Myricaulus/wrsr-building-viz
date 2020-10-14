import './index.css';
import * as serviceWorker from './serviceWorker';
import { OrbitControls } from './OrbitControls';
// ReactDOM.render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>,
//   document.getElementById('root')
// );

import * as THREE from 'three';

//import Stats from './jsm/libs/stats.module.js';

THREE.Cache.enabled = true;
//THREE.Loader.Handlers.add( /\.dds$/i, new THREE.DDSLoader() );

let camera = new THREE.PerspectiveCamera( 30, (window.innerWidth /2) / window.innerHeight, 1, 1500 );
new OrbitControls( camera ,document.getElementById("renderer"));
let renderer = new THREE.WebGLRenderer( { antialias: true } );
const scene = new THREE.Scene();
var line_z=0.01;
var increase_line_z = false;
let group = new THREE.Group();

init();
let loader = new THREE.TextureLoader();
loader.load('texture.png', function ( texture ) {
  let geometry = new THREE.SphereGeometry(1000, 20, 20);
  let material = new THREE.MeshBasicMaterial({map: texture});
  let mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
});
scene.add( group );	
parseEditor();

animate();

function init(){
  // CAMERA

  camera.position.set( 0, 0, 200 );
  camera.lookAt(0,0,0);

  // SCENE
  scene.background = new THREE.Color( 0x002200 );

  // LIGHTS

  let dirLight = new THREE.DirectionalLight( 0xffffff, 0.125 );
  dirLight.position.set( 0, 0, 1 ).normalize();
  scene.add( dirLight );

  let pointLight = new THREE.PointLight( 0xffffff, 1.5 );
  pointLight.position.set( 0, 100, 90 );
  scene.add( pointLight );

  // Renderer
  
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth / 2, window.innerHeight );
  let container = document.getElementById("renderer");
  if(container != null)
  {
    container.appendChild( renderer.domElement );
    container.style.touchAction = 'none';
  }
  window.addEventListener( 'resize', onWindowResize, false );

}

function throttle(func: Function, interval :number ) {
  let lastCall = 0;
  return function() {
      let now = Date.now();
      if (lastCall + interval < now) {
          lastCall = now;
          return func.apply(arguments);
      }
  };
}

document.getElementById("editor")?.addEventListener("keyup", throttle(parseEditor,1010));

function parseEditor()
{
  group.children.length = 0;
  let content = (document.getElementById("editor") as HTMLTextAreaElement).value;
  if (!content)
    return;
  let contentParts = content.split("$");
  let turning_points = [];
  let vehicle_stations = [];
  let entrence_points = [];
  let exit_points = [];
  let detour_points = []; // Without PID
  let detour_points_pid = [];
  line_z = 0.2;
  
  for (let index = 0; index < contentParts.length; index++) {
    let node = contentParts[index];
    // CONNECTIONS_ROAD_DEAD_SQUARE
    let res_viz = node.match(/CONNECTIONS_ROAD_DEAD_SQUARE\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+/i)
    if(res_viz)
    {
      let x1 = +res_viz[1];
      let y1 = +res_viz[2];
      let x2 = +res_viz[3];
      let y2 = +res_viz[4];
      
      let planeGeo ;
      if(x1 === x2)
      {
        planeGeo = drawSquare(x1-2,y1,x1+2,y2);
      }
      else if (y1 === y2) 
      {
        planeGeo = drawSquare(x1,y1-2,x2,y2+2);
      }
      else {
        planeGeo = drawSquare(x1,y1,x2,y2);
      }
      let planematerial = new THREE.MeshBasicMaterial( {color: 0x111111, side: THREE.DoubleSide});
      let plane = new THREE.Mesh( planeGeo, planematerial );
      plane.position.z=-0.1;
      group.add(plane);
    }
    // RESOURCE_VISUALIZATION
    res_viz = node.match(/RESOURCE_VISUALIZATION\s+1\s+position\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+rotation\s[-\d.]+\sscale\s([-\d.]+)\s([-\d.]+)\s([-\d.]+)\snumstepx\s[-\d.]+\s[-\d.]+\snumstept\s[-\d.]+\s[-\d.]+/i)
    if(res_viz)
    {
      let planeGeo = new THREE.PlaneBufferGeometry(+(res_viz[4]),+(res_viz[6]),1,1);
      let planematerial = new THREE.MeshBasicMaterial( {color: 0x04f2dd, side: THREE.DoubleSide} );
      let plane = new THREE.Mesh( planeGeo, planematerial );
      plane.position.x = +(res_viz[1]);
      plane.position.y = +(res_viz[3]);

      group.add(plane);
    }
    // CONNECTION_RAIL_ALLOWPASS
    res_viz = node.match(/CONNECTION_RAIL_ALLOWPASS\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i);
    if(res_viz)
    {
      let x1 = +res_viz[1];
      let y1 = +res_viz[2];
      let res_viz_2 = contentParts[index+1].match(/CONNECTION_RAIL_ALLOWPASS\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i);
      if (res_viz_2)
      {
        let x2 = +res_viz_2[1];
        let y2 = +res_viz_2[2];
        let planeGeo ;
        if(x1 === x2)
        {
          planeGeo = drawSquare(x1-2,y1,x1+2,y2);
        }
        else if (y1 === y2) 
        {
          planeGeo = drawSquare(x1,y1-2,x2,y2+2);
        }
        else {
          planeGeo = drawSquare(x1,y1,x2,y2);
        }
        
        let planematerial = new THREE.MeshBasicMaterial( {color: 0x333333, side: THREE.DoubleSide});
        let plane = new THREE.Mesh( planeGeo, planematerial );
        index++;
        group.add(plane);
      }
    }
    // CONNECTION_ROAD_DEAD
    res_viz = node.match(/CONNECTION_ROAD_DEAD\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i);
    if(res_viz)
    {
      let x1 = +res_viz[1];
      let y1 = +res_viz[2];
      let res_viz_2 = contentParts[index+1].match(/CONNECTION_ROAD_DEAD\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i);
      if (res_viz_2)
      {
        let x2 = +res_viz_2[1];
        let y2 = +res_viz_2[2];
        let planeGeo ;
        if(x1 === x2)
        {
          planeGeo = drawSquare(x1-2,y1,x1+2,y2);
        }
        else if (y1 === y2) 
        {
          planeGeo = drawSquare(x1,y1-2,x2,y2+2);
        }
        else {
          planeGeo = drawSquare(x1,y1,x2,y2);
        }
        
        let planematerial = new THREE.MeshBasicMaterial( {color: 0x444444, side: THREE.DoubleSide});
        let plane = new THREE.Mesh( planeGeo, planematerial );
        plane.position.z = -0.01;
        index++;
        group.add(plane);
      }
    }
    // CONNECTION_ROAD_* non dead
    res_viz = node.match(/CONNECTION_ROAD(_ALLOWPASS|_INPUT|_OUTPUT|)\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i);
    if(res_viz)
    {
      let x1 = +res_viz[2];
      let y1 = +res_viz[3];
      let x2 = +res_viz[4];
      let y2 = +res_viz[5];
      switch (res_viz[1]) {
        case "":
        case "_ALLOWPASS":
          exit_points.push([x1,y1]);
        case "_INPUT":
          entrence_points.push([x1,y1]);
          break;
        case "_OUTPUT":
          exit_points.push([x1,y1]);
          break;
        default:
          break;
      }
      let planeGeo ;
      if(x1 === x2)
      {
        planeGeo = drawSquare(x1-2,y1,x1+2,y2);
      }
      else if (y1 === y2) 
      {
        planeGeo = drawSquare(x1,y1-2,x2,y2+2);
      }
      else {
        planeGeo = drawSquare(x1,y1,x2,y2);
      }
      
      let planematerial = new THREE.MeshBasicMaterial( {color: 0x333333, side: THREE.DoubleSide});
      let plane = new THREE.Mesh( planeGeo, planematerial );
      plane.position.z=0.1;
      group.add(plane);
    }
    // VEHICLE_STATION
    res_viz = node.match(/VEHICLE_STATION\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i)
    if(res_viz)
    {
      let x1 = +res_viz[1];
      let y1 = +res_viz[2];
      let x2 = +res_viz[3];
      let y2 = +res_viz[4];

      
      let planeGeo ;
      if(x1 === x2)
      {
        planeGeo = drawSquare(x1-1,y1,x1+1,y2);
      }
      else if (y1 === y2) 
      {
        planeGeo = drawSquare(x1,y1-1,x2,y2+1);
      }
      else {
        planeGeo = drawSquare(x1,y1,x2,y2);
      }
      let planematerial;
      if(node.startsWith("COST"))
        planematerial = new THREE.MeshBasicMaterial( {color: 0xA0522D, side: THREE.DoubleSide});
      else
      {  
        planematerial = new THREE.MeshBasicMaterial( {color: 0x777777, side: THREE.DoubleSide});
        vehicle_stations.push([x1,y1]);
        turning_points.push([x2,y2]) ;
      }
      let plane = new THREE.Mesh( planeGeo, planematerial );
      group.add(plane);
    }
    // CONNECTION_CONNECTION
    res_viz = node.match(/^CONNECTION_CONNECTION\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i)
    if(res_viz)
    {
      let x1 = +res_viz[1];
      let y1 = +res_viz[2];
      let x2 = +res_viz[3];
      let y2 = +res_viz[4];
      
      let planeGeo ;
      if(x1 === x2)
      {
        planeGeo = drawSquare(x1-2,y1,x1+2,y2);
      }
      else if (y1 === y2) 
      {
        planeGeo = drawSquare(x1,y1-2,x2,y2+2);
      }
      else {
        planeGeo = drawSquare(x1,y1,x2,y2);
      }
      let planematerial = new THREE.MeshBasicMaterial( {color: 0xe8d400, side: THREE.DoubleSide});
      let plane = new THREE.Mesh( planeGeo, planematerial );
      group.add(plane);
    }
    res_viz = node.match(/STATION_NOT_BLOCK_DETOUR_POINT_PID\s+([-\d.]+)\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i);
    if(res_viz)
    {
      detour_points_pid.push([res_viz[2],res_viz[3],res_viz[1]]);
    }
    res_viz = node.match(/STATION_NOT_BLOCK_DETOUR_POINT\s+([-\d.]+)\s+[-\d.]+\s+([-\d.]+)\s+/i);
    if(res_viz)
    {
      detour_points.push([res_viz[1],res_viz[2]])
    }
  }
  
  drawLines(entrence_points,turning_points,new THREE.LineBasicMaterial({color: 0x00ff00}));
  drawLinesOneToOne(turning_points,vehicle_stations,new THREE.LineBasicMaterial({color: 0xffff00}));
  drawLinesOneToMany(vehicle_stations,detour_points_pid,new THREE.LineBasicMaterial({color: 0xffffff}));
  drawLines(vehicle_stations,exit_points,new THREE.LineBasicMaterial({color: 0xff00ff}));
  drawLines(detour_points_pid,exit_points,new THREE.LineBasicMaterial({color: 0xff00ff}));
}

function drawLines(starts:any[],ends:any[],material:THREE.LineBasicMaterial)
{
  starts.forEach(en_p => {
    ends.forEach(tu_p => {
      let points = [];
      points.push( new THREE.Vector3( en_p[0], en_p[1], line_z ) );
      points.push( new THREE.Vector3( tu_p[0], tu_p[1], line_z ) );
      if(increase_line_z)
        line_z++
      let geometry = new THREE.BufferGeometry().setFromPoints( points );
      
      let line = new THREE.Line( geometry, material );
      group.add( line );
    });
  });
}

function drawLinesOneToOne(starts:any[],ends:any[],material:THREE.LineBasicMaterial)
{
  for (let index = 0; index < starts.length; index++) {
      let points = [];
      points.push( new THREE.Vector3( starts[index][0], starts[index][1], line_z ) );
      points.push( new THREE.Vector3( ends[index][0], ends[index][1], line_z ) );
      let geometry = new THREE.BufferGeometry().setFromPoints( points );
      if(increase_line_z)
      line_z++
      let line = new THREE.Line( geometry, material );
      group.add( line );
  }
}

function drawLinesOneToMany(starts:any[],ends:any[],material:THREE.LineBasicMaterial)
{
  for (let index = 0; index < ends.length; index++) {
      const start_index = ends[index][2];
      let points = [];
      points.push( new THREE.Vector3( starts[start_index][0], starts[start_index][1], line_z ) );
      points.push( new THREE.Vector3( ends[index][0], ends[index][1], line_z ) );
      let geometry = new THREE.BufferGeometry().setFromPoints( points );
      if(increase_line_z)
      line_z++
      let line = new THREE.Line( geometry, material );
      group.add( line );
  }
}



function drawSquare(x1:number, y1:number, x2:number, y2:number) {

	let square = new THREE.Geometry();
	square.vertices.push(new THREE.Vector3(x1,y1,0));
  square.vertices.push(new THREE.Vector3(x1,y2,0));
  square.vertices.push(new THREE.Vector3(x2,y1,0));
  square.vertices.push(new THREE.Vector3(x2,y2,0));
  
  square.faces.push(new THREE.Face3(0,1,2));
  square.faces.push(new THREE.Face3(1,2,3));
	return square;
}
 
function onWindowResize() {
  camera.aspect = window.innerWidth/ 2 / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth / 2, window.innerHeight );
}

function animate() {
  requestAnimationFrame( animate );
  render();
}

function render() {
  renderer.clear();
  renderer.render( scene, camera );

}

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
