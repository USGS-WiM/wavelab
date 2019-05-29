import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormBuilder, FormGroup, Validators, Form, FormControl } from '@angular/forms';
import { Http, Response, RequestOptions, URLSearchParams, Headers, ResponseContentType, ResponseType } from '@angular/http';
import { FileUploader } from 'ng2-file-upload';
import 'rxjs';
import { saveAs } from 'file-saver';
import * as Highcharts from 'highcharts';
import { ToasterService, ToasterConfig } from 'angular2-toaster/angular2-toaster';
import { formatDate } from '@angular/common';

declare let gtag: Function;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  public procedures;
  public selectedProcedure: string;
  public uploadedFiles = [];
  public proceduresURL = 'https://stnpseudoprod.wim.usgs.gov/wavelabservices/procedures';
  public outputName = 'Output';
  public showWaitCursor: boolean;
  public fileError;
  public fileTypes = [];
  public acceptMultiple: boolean;
  public config;
  public disableSubmit = true;
  public currentDate = formatDate(new Date(), 'M/d/yyyy h:m:s', 'en-us');
  public chart: any;
  public _chartOptions: any;
  public showChart = false;
  public response;

  public toastConfig: ToasterConfig = new ToasterConfig({
      showCloseButton: true,
      tapToDismiss: false,
      timeout: 0
  });

  @ViewChild('fileUpload') fileUpload: ElementRef;
  @ViewChild('scrollBottom') private scrollBottom: ElementRef;

  public uploader: FileUploader = new FileUploader({
    isHTML5: true
  });

  constructor(private fb: FormBuilder, private http: Http, private _toasterService: ToasterService) {}

  ngOnInit() {
    this.showWaitCursor = false;
    this.fileError = '';
    const JSON_HEADERS = new Headers({ Accept: 'application/json' });
    const options = new RequestOptions({ headers: JSON_HEADERS });
    const self = this;
    this.http.get(this.proceduresURL, options).subscribe(
      // get available procedures for select
      p => {
        this.procedures = p;
        this.procedures = JSON.parse(this.procedures._body);
      },
      error => {
        this.errorHandler(error);
      }
    );

    this._chartOptions = {
      credits: {
        enabled: false
      },
      chart: {
        type: 'scatter',
        zoomType: 'xy',
      },
      xAxis: {
        title: {
          text: 'Time'
        },
        startOnTick: true,
        endOnTick: true,
        showLastLabel: true,
        labels: {
          formatter: function() {
            const date = new Date(this.value);
            return date.getUTCFullYear() + '-' + self.pad(date.getUTCMonth() + 1) + '-' + self.pad(date.getUTCDate()) + ' '
                + self.pad(date.getUTCHours()) + ':' + self.pad(date.getUTCMinutes()) + ':' + self.pad(date.getUTCSeconds());
          }
        },
        type: 'datetime'
      },
      yAxis: {
        title: {
          text: 'Pressure'
        }
      },
      legend: {
        enabled: false
      },
      plotOptions: {
        scatter: {
          marker: {
            radius: 5,
            states: {
              hover: {
                enabled: true,
                lineColor: 'rgb(100,100,100)'
              }
            }
          },
          tooltip: {
            headerFormat: '<b>{point.x:%Y-%m-%d %H:%M:%S}<b><br>',
            pointFormat: '{point.y}',
            shared: true
          }
        },
        series: {
            turboThreshold: 5000
        }
      },
      responsive: {
        rules: [
          {
            condition: {
              maxWidth: 500
            },
            chartOptions: {
              legend: {},
              yAxis: {
                labels: {},
                title: {
                  text: null
                }
              },
              subtitle: {
                text: null
              },
              credits: {
                enabled: false
              }
            }
          }
        ]
      }
    };
    this.chart = new Highcharts.Chart('chart', this._chartOptions);
    this.chart.setTitle({ text: 'Data Preview'});
  }

  public getConfig(procedure) {
    // get the configuration/list of inputs needed for the procedure
    this.showChart = false;
    if (this.selectedProcedure === 'Wave') {
      this.acceptMultiple = true;
    } else {
      this.acceptMultiple = false;
    }
    if (this.fileUpload) {
      this.fileUpload.nativeElement.value = '';
    }
    this.fileError = '';
    this.fileTypes = [];
    this.uploadedFiles = [];

    const JSON_HEADERS = new Headers({ Accept: 'application/json' });
    const options = new RequestOptions({ headers: JSON_HEADERS });
    this.http.get(this.proceduresURL + '/' + procedure, options).subscribe(
      p => {
        this.config = p;
        this.config = JSON.parse(this.config._body);
        Object.keys(this.config.configuration).forEach(key => {
            const item = this.config.configuration[key];
            if (item.value) {delete item.value; }
            if (item.valueType === 'date') {item['inputDate'] = ''; }
        });
        this.checkInputs();
      },
      error => {
        this.errorHandler(error);
      }
    );
  }

  public inputChanged(item, value) {
    // assign inputs to the config json depending on type of input needed
    const i = this.config.configuration.findIndex(function(obj) {
      return obj.name === item;
    });
    const param = this.config.configuration[i];
    if (param.valueType === 'date' && value) {
        const date = new Date(Date.parse(value));
        param.value = date.getUTCFullYear() + '-' + this.pad(date.getUTCMonth() + 1) + '-' + this.pad(date.getUTCDate()) + 'T'
                + this.pad(date.getHours()) + ':' + this.pad(date.getMinutes()) + ':' + this.pad(date.getSeconds()) + '.' +
                (date.getMilliseconds() / 1000).toFixed(3).slice(2, 5) + 'Z';
    } else if (param.valueType === 'numeric' && value) {
      param.value = Number(value);
    } else if (param.valueType === 'coordinates array') {
      param.value = value.split(',');
    } else {
      param.value = value;
    }
    console.log(value); console.log(param);
    if (item === 'Output file Name') {
      this.outputName = value;
    }
    this.checkInputs();
  }

  public upload(files) {
    // add files to file list, as well as adding name of file to config.
    if (files.length > 0) {
      if (this.selectedProcedure === 'Wave') {
        for (const file of files) {
          this.uploadedFiles.push(file);
        }
        if (this.uploadedFiles.length < 3) {
          for (let i = 0; i < this.uploadedFiles.length; i++) {
            this.config.configuration[i].value = this.uploadedFiles[i].name;
            this.fileTypes.push(this.uploadedFiles[i].name.split('.').pop());
          }
        }
      } else {
        this.fileTypes = [];
        this.uploadedFiles = [files[0]];
        this.config.configuration[0].value = files[0].name;
        this.fileTypes.push(files[0].name.split('.').pop());
      }
      this.checkInputs();
    }
  }

  public removeFile(fileName) {
    // remove file from file list
    const index = this.uploadedFiles.findIndex(function(file) {
      return file.name === fileName;
    });
    this.uploadedFiles.splice(index, 1);
    this.fileTypes = [];
    if (this.selectedProcedure === 'Wave') {
      for (let i = 0; i < this.uploadedFiles.length; i++) {
        this.config.configuration[i].value = this.uploadedFiles[i].name;
        this.fileTypes.push(this.uploadedFiles[i].name.split('.').pop());
      }
    } else {
      this.uploadedFiles = [];
    }
    this.checkInputs();
    this.checkFiles();
  }

  public checkInputs() {
    // makes sure there are no required values still missing, disables submit button if so
    this.disableSubmit = false;
    let count = 0;
    for (const val of this.config.configuration) {
      if (val.required && val.value == null) {
        count++;
      }
    }
    if (count === 0) {
      this.disableSubmit = false;
    } else {
      this.disableSubmit = true;
    }
    if (this.uploadedFiles.length > 0) {
        this.checkFiles();
      }
  }

  public checkFiles() {
    // adds warning if incorrect file types or number of files given
    this.fileError = '';
    if (this.selectedProcedure === 'Read' && this.fileTypes.indexOf('csv') === -1) {
      this.fileError = 'Incorrect file type, need .csv.';
      this.disableSubmit = true;
    } else if (this.selectedProcedure === 'Barometric' && this.fileTypes.indexOf('csv') === -1) {
      this.fileError = 'Incorrect file type, need .csv.';
      this.disableSubmit = true;
    } else if (this.selectedProcedure === 'Wave' && (this.fileTypes.indexOf('csv') === -1 || this.fileTypes.indexOf('nc') === -1)) {
      this.fileError = 'CSV and NetCDF files needed.';
      this.disableSubmit = true;
    }

    if (this.selectedProcedure === 'Wave' && this.uploadedFiles.length !== 2) {
      this.fileError = '2 files needed: CSV and NetCDF files.';
      this.disableSubmit = true;
    }
  }

  public runProc() {
    // posts config to procedures url
    if (['Read', 'Barometric'].indexOf(this.selectedProcedure) > -1 && !this.config.configuration[1].value) {
        this.config.configuration[1].value = this.outputName;
    } else if (this.selectedProcedure === 'Wave' && !this.config.configuration[2].value) {
        this.config.configuration[2].value = this.outputName;
    }
    gtag('event', 'click', { event_category: 'procedures', event_label: this.selectedProcedure });
    this.showWaitCursor = true;
    const formData = new FormData();
    for (const file of this.uploadedFiles) {
      formData.append('file', file);
    }
    formData.append('configList', JSON.stringify(this.config));
    let opt = {}; let format = '';
    if (this.selectedProcedure !== 'Read') {
        opt = {responseType: ResponseContentType.Blob};
        format = '?format=zip'; // if not running 'Read' procedure, output to zip file instead
    }

    this.http.post(this.proceduresURL + format, formData, opt).subscribe(
      response => {
        this.showWaitCursor = false;
        this.response = response;
        this.selectedProcedure === 'Read' ? this.showReadChart() : this.downLoadFile();
      },
      error => {
        this.showWaitCursor = false;
        if (this.selectedProcedure === 'Read') {this.showChart = false; }
        this.errorHandler(error);
      }
    );
  }

  public downLoadFile() {
    // downloads zip file
    gtag('event', 'click', {'event_category': 'download', 'event_label': 'Download zip'});
    console.log(JSON.stringify(this.response._body));
    saveAs(this.response._body, this.outputName);
  }

  public downloadJson() {
      // downloads json from read procudure to json file
      gtag('event', 'click', {'event_category': 'download', 'event_label': 'Download json (Read)'});
      const blob = new Blob([this.response._body], {type: 'text/json'});
      saveAs(blob, this.outputName + '.json');
  }

  public showReadChart() {
    // outputs result of read function to chart for data preview
    if (this.response._body.charAt(0) !== '{') {
        this.errorHandler('Trouble reading csv file. Check for correct type.');
        this.showChart = false;
        return;
    }
    const body = this.response._body;
    const tableData = JSON.parse(body); // got this working, now add to scatter plot
    while (this.chart.series && this.chart.series.length > 0) { this.chart.series[0].remove(true); }
    if (tableData !== null) {
        const seriesData = new Array();
        let i = 0;
        // limiting results to 2000, increments depending on length of data
        const increment = Math.round(Object.keys(tableData).length / 2000);
        for (const key in tableData) {
            if (i % increment === 0 && seriesData.length < 2000) {
                const date = key.split(/[:|\-|T|Z]+/);
                const newDate = Date.UTC(Number(date[0]), Number(date[1]) - 1, Number(date[2]), Number(date[3]),
                    Number(date[4]), Number(date[5]));
                const obj = {x: newDate, y: tableData[key]};
                if (JSON.stringify(seriesData).indexOf(JSON.stringify(obj)) === -1) {
                    seriesData.push(obj);
                }
                i ++;
            } else if (seriesData.length < 2000) {
                i ++;
            } else {
                break;
            }
        }
        this.chart.addSeries({ data: seriesData});
        this.showChart = true;
        setTimeout(function() { window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'}); }, 100);
    } else {
        this.errorHandler('Error reading .csv file, please double-check your inputs.');
    }
  }

  public errorHandler(error) {
    if (error.headers) {this.outputWimMessages(error);
    } else { this._toasterService.pop('error', 'Error', error); }
  }

  public outputWimMessages(res) {
    const wimMessages = JSON.parse(res.headers.get('x-usgswim-messages'));
    if (wimMessages) {
        for (const key of Object.keys(wimMessages)) {
            for (const item of wimMessages[key]) {
                if (['warning', 'error'].indexOf(key) > -1) {this._toasterService.pop(key, key.charAt(0).toUpperCase() + key.slice(1), item);}
            }
        }
    }
  }

  pad(number) {
      if (number < 10) {
          return '0' + number;
      }
      return number;
  }
}

