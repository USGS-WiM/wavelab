import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, Form, FormControl } from '@angular/forms';
import { Http, Response, RequestOptions, URLSearchParams, Headers } from '@angular/http';
import { FileUploader } from 'ng2-file-upload';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  public procedures;
  public proc_response;
  public selectedProcedure: string;
  public uploadedFiles = [];

  @ViewChild('fileUpload') fileUpload: ElementRef;

  public uploader: FileUploader = new FileUploader({
    isHTML5: true
  });

  public config;
  public disableSubmit = true;

  constructor(private fb: FormBuilder, private http: Http) { }


  ngOnInit() {
    const JSON_HEADERS = new Headers({ 'Accept': 'application/json' });
    const options = new RequestOptions({ headers: JSON_HEADERS });
    this.http.get('https://stnpseudoprod.wim.usgs.gov/wavelabservices/procedures', options)
      .subscribe(p => {
        this.procedures = p;
        this.procedures = JSON.parse(this.procedures._body);
      });
  }

  public getConfig(procedure) {
    const JSON_HEADERS = new Headers({ 'Accept': 'application/json' });
    const options = new RequestOptions({ headers: JSON_HEADERS });
    this.http.get('https://stnpseudoprod.wim.usgs.gov/wavelabservices/procedures/' + procedure, options)
      .subscribe(p => {
        this.config = p;
        this.config = JSON.parse(this.config._body);
        console.log(this.config);
        if (this.fileUpload) { this.fileUpload.nativeElement.value = ''; }
        this.checkInputs();
      });
  }

  public inputChanged(item, value) {
    const i = this.config.configuration.findIndex(function (obj) { return obj.name === item; });
    this.config.configuration[i].value = value;
    this.checkInputs();
  }

  public checkInputs() {
    let count = 0;
    for (const val of this.config.configuration) {
      if (val.required && val.value == null) { count++; }
    }
    if (count === 0) {
    this.disableSubmit = false;
    } else { this.disableSubmit = true; }
  }

  public upload(files) {
    console.log(files);
    this.uploadedFiles = files;
    let i = 0;
    for (const file of files) {
      this.config.configuration[i].value = file.name;
      i++;
    }
    this.checkInputs();
  }

  public runProc() {
    const formData = new FormData();
    for (const file of this.uploadedFiles) { formData.append('file', file); }
    formData.append('configList', JSON.stringify(this.config));
    const JSON_HEADERS = new Headers({ 'Content-Type': 'multipart/form-data', 'Accept': 'application/zip' });
    const options = new RequestOptions({ headers: JSON_HEADERS });
    this.http.post('https://stnpseudoprod.wim.usgs.gov/wavelabservices/procedures?format=zip', formData, options)
      .subscribe(response => {
        console.log('got response');
        this.downLoadFile(response, 'application/zip');
      });
  }

  public downLoadFile(data: any, type: string) {
    const blob = new Blob([data], { type: type });
    const url = window.URL.createObjectURL(blob);
    const pwa = window.open(url);
    if (!pwa || pwa.closed || typeof pwa.closed === 'undefined') {
      alert('Please disable your Pop-up blocker and try again.');
    }
  }
}

