import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { FileSelectDirective, FileUploadModule } from 'ng2-file-upload';
import { MatFormFieldModule, MatSelectModule, MatIconModule, MatCardModule, MatAutocompleteModule } from '@angular/material';
import { MatListModule } from '@angular/material/list';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import { ToasterModule, ToasterService } from 'angular2-toaster';


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    HttpModule,
    MatFormFieldModule,
    MatSelectModule,
    FileUploadModule,
    MatIconModule,
    MatCardModule,
    MatListModule,
    NgMultiSelectDropDownModule.forRoot(),
    ToasterModule,
    MatAutocompleteModule
  ],
  providers: [ToasterService],
  bootstrap: [AppComponent]
})
export class AppModule { }
