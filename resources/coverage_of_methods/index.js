'use strict';

function drawVennDiagram(htmlElement, sets, title) {

  var sub_div = document.createElement("div");

  var title_node = document.createElement("h3");
  title_node.appendChild(document.createTextNode(title));

  var sub_sub_div = document.createElement("div");

  sub_div.appendChild(title_node);
  sub_div.appendChild(sub_sub_div);

  var root_canvas = htmlElement;
  root_canvas.appendChild(sub_div);

  var chart = venn.VennDiagram();
  var div = d3.select(sub_div).datum(sets);
  var layout = chart(div);
  var textCentres = layout.textCentres;

  // add new sublabels (growing from middle)
  layout.enter
  .append("text")
  .attr("class", "sublabel")
  .style("fill", "#666")
  .attr("text-anchor", "middle")
  .attr("dy", "0")
  .attr("x", chart.width() /2)
  .attr("y", chart.height() /2);

  // move existing
  layout.update
  .selectAll(".label")
  .style("font-size", "16px")

  // move existing
  layout.update
  .selectAll(".sublabel")
  .filter(function (d) { return d.sets in textCentres; })
  .text(function(d) {
    if (d.sets.length === 1) {
      return "" + (d.percentage * 100).toFixed(0) + "% (" + d.size + ")";
    }
    else {
      return "";
    }
  })
  .style("font-size", "14px")
  .attr("dy", "18")
  .attr("x", function(d) { return Math.floor(textCentres[d.sets].x);})
  .attr("y", function(d) { return Math.floor(textCentres[d.sets].y);});

}

function intersect2(set1, set2) {
  return new Set(
    [...set1].filter(x => set2.has(x))
  );
}

function intersect3(set1, set2, set3) {
  return intersect2(set1, intersect2(set2, set3));
}

function jsonpToVennSets(jsonp, filter_f, subclass) {
  filter_f = filter_f || (_ => true);

  var total_number = (subclass === "TOTAL") ? jsonp.counts.TOTAL : ((subclass === "ST") ? jsonp.counts.ST : jsonp.counts.NL);

  var a = jsonp.A.results.filter(filter_f);
  var b = jsonp.B.results.filter(filter_f);
  var c = jsonp.C.results.filter(filter_f);

  var A = new Set(a);
  var B = new Set(b);
  var C = new Set(c);

  var AiB = intersect2(A, B);
  var AiC = intersect2(A, C);
  var BiC = intersect2(B, C);

  var AiBiC = intersect3(A, B, C);

  var AuBuC = new Set([...A, ...B, ...C]); //union

  var sets = [ //not unique percentages
    {sets: ['A'], size: A.size, label: jsonp.A.label, percentage: a.length / total_number},
    {sets: ['B'], size: B.size, label: jsonp.B.label, percentage: b.length / total_number},
    {sets: ['C'], size: C.size, label: jsonp.C.label, percentage: c.length / total_number},
    {sets: ['A','B'], size: AiB.size},
    {sets: ['A','C'], size: AiC.size},
    {sets: ['B','C'], size: BiC.size},
    {sets: ['A','B','C'], size: AiBiC.size}
  ];

  return sets;
}

function draw(jsonp, title_prefix, filter_f) {
  filter_f = filter_f || (_ => true);

  var div = document.createElement("div");
  var title_node = document.createElement("h1");
  title_node.appendChild(document.createTextNode(title_prefix));
  div.appendChild(title_node);

  drawVennDiagram(div, jsonpToVennSets(jsonp, (x => filter_f(x)), "TOTAL"), title_prefix + " TOTAL");
  drawVennDiagram(div, jsonpToVennSets(jsonp, (x => filter_f(x) && x.includes('|e_2|0|')), "ST"), title_prefix + " ST");
  drawVennDiagram(div, jsonpToVennSets(jsonp, (x => filter_f(x) && x.includes('|e_2|1|')), "NL"), title_prefix + " NL");

  var row = document.createElement("hr");
  div.appendChild(row);

  var root_canvas = document.getElementById("venn");
  root_canvas.appendChild(div);
}

//---------------------------------------------------------------------------------------------------------------

draw(nala_discoveries, 'nala_discoveries');
draw(SetsKnown, 'Var120', (x => x.includes('-')));
draw(SetsKnown, 'SetsKnown');

var SetsKnownBalancedAccepted = new Set();
var SetsKnownBalancedAll = SetsKnown.A.results.concat(SetsKnown.B.results.concat(SetsKnown.C.results));

SetsKnownBalancedAll.forEach(function(x) {
  //Var120
  if (x.includes('-')) {
    SetsKnownBalancedAccepted.add(x);
  }
  //nala-known
  else if (x.includes('s1')) {
    var bar = SetsKnown.Var120_counts.TOTAL / SetsKnown.nala_known_counts.TOTAL; //0.3539823009
    if (Math.random() < bar) {
      SetsKnownBalancedAccepted.add(x);
    }
  }
  //SETH
  else { //SETH
    var bar = SetsKnown.Var120_counts.TOTAL / SetsKnown.SETH_counts.TOTAL; //0.1327433628
    if (Math.random() < bar) {
      SetsKnownBalancedAccepted.add(x);
    }
  }
});

draw(SetsKnown, 'SetsKnown(Balanced)', (x => SetsKnownBalancedAccepted.has(x)));
