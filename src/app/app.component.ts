import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, Form, FormControl } from '@angular/forms';
import { Http, Response, RequestOptions, URLSearchParams, Headers, ResponseContentType } from '@angular/http';
import { FileUploader } from 'ng2-file-upload';
import 'rxjs';
import { saveAs } from 'file-saver';

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
  public currentDate = new Date().toLocaleDateString();

  @ViewChild('fileUpload') fileUpload: ElementRef;

  public uploader: FileUploader = new FileUploader({
    isHTML5: true
  });

  constructor(private fb: FormBuilder, private http: Http) { }


  ngOnInit() {
    this.showWaitCursor = false;
    this.fileError = '';
    const JSON_HEADERS = new Headers({ 'Accept': 'application/json' });
    const options = new RequestOptions({ headers: JSON_HEADERS });
    this.http.get(this.proceduresURL, options)
      .subscribe(p => {
        this.procedures = p;
        this.procedures = JSON.parse(this.procedures._body);
      }, (error) => {
        this.errorHandler(error);
      });
  }

  public getConfig(procedure) {
    if (this.selectedProcedure === 'Wave') { this.acceptMultiple = true;
    } else {this.acceptMultiple = false; }
    if (this.fileUpload) { this.fileUpload.nativeElement.value = ''; }
    this.fileError = ''; this.fileTypes = []; this.uploadedFiles = [];

    const JSON_HEADERS = new Headers({ 'Accept': 'application/json' });
    const options = new RequestOptions({ headers: JSON_HEADERS });
    this.http.get(this.proceduresURL + '/' + procedure, options)
      .subscribe(p => {
        this.config = p;
        this.config = JSON.parse(this.config._body);
        this.checkInputs();
      }, (error) => {
        this.errorHandler(error);
      });
  }

  public inputChanged(item, value) {
    const i = this.config.configuration.findIndex(function (obj) { return obj.name === item; });
    const param = this.config.configuration[i];
    if (param.valueType === 'date') {param.value = new Date(value).toISOString();
    } else if (param.valueType === 'numeric') {param.value = Number(value);
    } else if (param.valueType === 'coordinates array') { param.value = value.split(',');
    } else { param.value = value; }
    if (item === 'Output file Name') { this.outputName = value; }
    this.checkInputs();
  }

  public upload(files) {
    if (this.selectedProcedure === 'Wave') {
      for (const file of files) { this.uploadedFiles.push(file); }
      if (files.length < 3) {
        for (let i = 0; i < files.length; i ++) {
          this.config.configuration[i].value = files[i].name;
          this.fileTypes.push(files[i].name.split('.').pop());
        }
      }
    } else {
      this.uploadedFiles = files;
      this.config.configuration[0].value = files[0].name;
      this.fileTypes.push(files[0].name.split('.').pop());
    }
    this.checkInputs();
  }

  public removeFile(fileName) {
    const index = this.uploadedFiles.findIndex(function (file) { return file.name === fileName; });
    this.uploadedFiles.splice(index, 1);
    if (this.selectedProcedure === 'Wave') {
      for (let i = 0; i < this.uploadedFiles.length; i ++) {
        this.config.configuration[i].value = this.uploadedFiles[i].name;
        this.fileTypes.push(this.uploadedFiles[i].name.split('.').pop());
      }
    }
    this.checkInputs();
  }

  public checkInputs() {
    this.disableSubmit = false;
    let count = 0;
    for (const val of this.config.configuration) {
      if (val.required && val.value == null) { count++; }
    }
    if (count === 0) {
      this.disableSubmit = false;
    } else { this.disableSubmit = true; }
    if (this.uploadedFiles.length > 0) { this.checkFiles(); }
  }

  public checkFiles() {
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
    gtag('event', 'click', {'event_category': 'procedures', 'event_label': this.selectedProcedure});
    this.showWaitCursor = true;
    const formData = new FormData();
    for (const file of this.uploadedFiles) { formData.append('file', file); }
    formData.append('configList', JSON.stringify(this.config));
    this.http.post(this.proceduresURL + '?format=zip', formData, {responseType: ResponseContentType.Blob})
      .subscribe(response => {
        this.showWaitCursor = false;
        this.downLoadFile(response);
      }, (error) => {
        this.showWaitCursor = false;
        this.errorHandler(error);
      });
  }

  public downLoadFile(data: any) {
    gtag('event', {'event_category': 'procedures', 'event_label': 'file download'});
    saveAs(data._body, this.outputName);
  }

  public errorHandler(error) {
    window.alert(error);
  }
}

